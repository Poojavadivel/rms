import { useEffect, useState } from 'react';
import { CheckCircle, Clock, ChefHat, Package, ArrowLeft, Copy, Check, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order } from '@/client/app/App';
import { apiRequest } from '@/client/api/client';
import { fetchSystemConfig } from '@/client/api/config';

interface KioskConfirmationProps {
  order: Order;
  onNewOrder: () => void;
  onGoHome: () => void;
}

export default function KioskConfirmation({ order, onNewOrder, onGoHome }: KioskConfirmationProps) {
  const [currentStatus, setCurrentStatus] = useState<Order['status']>(order.status || 'preparing');
  const [copied, setCopied] = useState(false);
  const [sysConfig, setSysConfig] = useState({ restaurantName: 'Restaurant', logoUrl: '/favicon.png' });

  useEffect(() => {
    fetchSystemConfig().then((cfg) => {
      setSysConfig({ restaurantName: cfg.restaurantName || 'Restaurant', logoUrl: cfg.logoUrl || '/favicon.png' });
    }).catch(() => {});
  }, []);

  // Poll the real order status from the backend every 5 seconds
  useEffect(() => {
    if (!order?.id) return;

    const TERMINAL_STATUSES: Order['status'][] = ['served', 'completed'];

    const poll = async () => {
      try {
        const res = await apiRequest<{ status: Order['status'] }>(`/orders/${order.id}`);
        if (res?.status) {
          setCurrentStatus(res.status);
        }
      } catch {
        // silently keep last known status
      }
    };

    poll();
    const interval = setInterval(() => {
      if (TERMINAL_STATUSES.includes(currentStatus)) {
        clearInterval(interval);
        return;
      }
      poll();
    }, 5000);

    return () => clearInterval(interval);
  }, [order?.id, currentStatus]);

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const loadImageAsBase64 = (url: string): Promise<string | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });

  const handleDownloadReceipt = async () => {
    const dateStr = new Date(order.date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
    const w = doc.internal.pageSize.getWidth();
    const ml = 5; // margin left
    const mr = 5; // margin right
    const contentW = w - ml - mr;
    let y = 5;

    // Logo
    const imgData = await loadImageAsBase64(sysConfig.logoUrl);
    if (imgData) {
      const logoSize = 12;
      doc.addImage(imgData, 'PNG', w / 2 - logoSize / 2, y, logoSize, logoSize);
      y += 15;
    } else {
      y = 10;
    }

    // Header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);
    doc.text(sysConfig.restaurantName, w / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text('Kiosk Order Receipt', w / 2, y, { align: 'center' });
    y += 5;

    // Dashed line
    doc.setDrawColor(180);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(ml, y, w - mr, y);
    y += 6;

    // Order ID
    doc.setTextColor(80);
    doc.setFontSize(8);
    doc.text('Order ID', w / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);
    doc.text(order.id, w / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(dateStr, w / 2, y, { align: 'center' });
    y += 5;

    // Dashed line
    doc.setDrawColor(180);
    doc.line(ml, y, w - mr, y);
    y += 3;

    // Items table
    const tableData = order.items.map((item) => [
      item.name,
      String(item.quantity),
      `Rs.${(item.price * item.quantity).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Item', 'Qty', 'Amount']],
      body: tableData,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2, textColor: [40, 40, 40], overflow: 'linebreak' },
      headStyles: { fontStyle: 'bold', fontSize: 8, textColor: [20, 20, 20], lineWidth: { bottom: 0.3 }, lineColor: [100, 100, 100] },
      columnStyles: {
        0: { cellWidth: contentW * 0.50, halign: 'left' },
        1: { cellWidth: contentW * 0.15, halign: 'center' },
        2: { cellWidth: contentW * 0.35, halign: 'right' },
      },
      margin: { left: ml, right: mr },
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // Totals section
    doc.setDrawColor(180);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(ml, y, w - mr, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    doc.text('Subtotal', ml + 1, y);
    doc.text(`Rs.${(order.subtotal ?? 0).toFixed(2)}`, w - mr - 1, y, { align: 'right' });
    y += 5;
    doc.text('GST (5%)', ml + 1, y);
    doc.text(`Rs.${(order.tax ?? 0).toFixed(2)}`, w - mr - 1, y, { align: 'right' });
    y += 4;

    // Total line
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(30);
    doc.setLineWidth(0.4);
    doc.line(ml, y, w - mr, y);
    y += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20);
    doc.text('Total Paid', ml + 1, y);
    doc.text(`Rs.${order.total.toFixed(2)}`, w - mr - 1, y, { align: 'right' });
    y += 8;

    // Footer
    doc.setDrawColor(180);
    doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.2);
    doc.line(ml, y, w - mr, y);
    y += 5;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140);
    doc.text('Thank you for your order!', w / 2, y, { align: 'center' });
    y += 4;
    doc.text('Show your Order ID at the counter', w / 2, y, { align: 'center' });
    y += 3;
    doc.text('to collect your food.', w / 2, y, { align: 'center' });

    doc.save(`Receipt-${order.id}.pdf`);
  };

  const steps = [
    { key: 'preparing', label: 'Preparing', icon: ChefHat, description: 'Your food is being prepared in the kitchen' },
    { key: 'ready', label: 'Ready', icon: Package, description: 'Your order is ready for pickup at the counter' },
    { key: 'completed', label: 'Collected', icon: CheckCircle, description: 'Order collected. Enjoy your meal!' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStatus);
  const isReady = currentStatus === 'ready' || currentStatus === 'served';
  const isCompleted = currentStatus === 'completed';

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E2723] to-[#5D4037] text-white py-4 px-4 sm:px-6 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Order Confirmed
          </h1>
          <p className="text-white/70 text-xs">Track your order status below</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isReady
              ? 'bg-green-100 animate-bounce'
              : isCompleted
              ? 'bg-green-100'
              : 'bg-[#FAF0E4]'
          }`}>
            {isReady || isCompleted ? (
              <CheckCircle className="w-10 h-10 text-green-600" />
            ) : (
              <ChefHat className="w-10 h-10 text-[#8B5A2B] animate-pulse" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-[#3E2723] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            {isReady ? 'Order Ready!' : isCompleted ? 'Order Completed' : 'Order Placed!'}
          </h2>
          <p className="text-gray-500 text-sm">
            {isReady
              ? 'Please collect your order at the counter'
              : isCompleted
              ? 'Thank you for dining with us!'
              : 'Your order is being prepared'}
          </p>
        </div>

        {/* Order ID Card */}
        <div className="bg-white rounded-2xl border-2 border-[#C8A47A] p-6 mb-6 text-center shadow-md">
          <p className="text-xs font-semibold text-[#8B5A2B] uppercase tracking-wider mb-2">Your Order ID</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-3xl sm:text-4xl font-black text-[#3E2723] tracking-wider font-mono">
              {order.id}
            </p>
            <button
              onClick={handleCopyOrderId}
              className="p-2 text-[#8B5A2B] hover:bg-[#FAF0E4] rounded-lg transition-colors"
              title="Copy Order ID"
            >
              {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Show this ID at the counter to collect your food
          </p>
        </div>

        {/* Status Tracker */}
        <div className="bg-white rounded-xl border border-[#E8D5B5] p-5 mb-6 shadow-sm">
          <h3 className="font-bold text-[#3E2723] mb-4 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
            Order Status
          </h3>
          <div className="space-y-4">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index <= currentStepIndex || (isReady && index <= 1);
              const isCurrent = step.key === currentStatus || (isReady && step.key === 'ready');

              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive
                        ? isCurrent
                          ? 'bg-[#8B5A2B] ring-4 ring-[#C8A47A]/30'
                          : 'bg-green-500'
                        : 'bg-gray-200'
                    }`}>
                      <StepIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-0.5 h-8 mt-1 ${isActive ? 'bg-green-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className="pt-1">
                    <p className={`font-semibold text-sm ${isActive ? 'text-[#3E2723]' : 'text-gray-400'}`}>
                      {step.label}
                      {isCurrent && !isCompleted && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-[#8B5A2B]">
                          <Clock className="w-3 h-3 animate-pulse" /> In progress
                        </span>
                      )}
                    </p>
                    <p className={`text-xs ${isActive ? 'text-gray-500' : 'text-gray-300'}`}>{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-xl border border-[#E8D5B5] p-4 mb-6 shadow-sm">
          <h3 className="font-bold text-[#3E2723] mb-3 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
            Order Details
          </h3>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                  </div>
                  <span className="text-[#3E2723]">{item.name}</span>
                  <span className="text-gray-400">×{item.quantity}</span>
                </div>
                <span className="font-semibold text-[#8B5A2B]">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#E8D5B5] mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span>₹{(order.subtotal ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>GST (5%)</span>
              <span>₹{(order.tax ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-[#3E2723] pt-1">
              <span>Total Paid</span>
              <span className="text-[#8B5A2B]">₹{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDownloadReceipt}
            className="px-5 py-3 bg-[#3E2723] text-[#C8A47A] rounded-xl font-bold text-sm hover:bg-[#5D4037] transition-all active:scale-95 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Receipt
          </button>
          <button
            onClick={onNewOrder}
            className="flex-1 py-3 bg-gradient-to-r from-[#8B5A2B] to-[#C8A47A] text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all active:scale-95"
          >
            Place New Order
          </button>
          <button
            onClick={onGoHome}
            className="px-6 py-3 border-2 border-[#8B5A2B] text-[#8B5A2B] rounded-xl font-bold text-sm hover:bg-[#FAF0E4] transition-all active:scale-95"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
