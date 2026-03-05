import { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, CreditCard, Smartphone, Wallet, ArrowLeft, Loader2 } from 'lucide-react';
import type { CartItem, Order } from '@/client/app/App';
import { MenuItemImage } from '@/client/app/components/MenuItemImage';

interface KioskCartProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: (order: Order) => void;
  onBackToMenu: () => void;
}

export default function KioskCart({ cart, onUpdateQuantity, onRemoveItem, onCheckout, onBackToMenu }: KioskCartProps) {
  const [selectedPayment, setSelectedPayment] = useState<'upi' | 'card' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [upiError, setUpiError] = useState<string | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.05; // 5% GST
  const total = subtotal + tax;

  const handlePayment = () => {
    if (!selectedPayment) return;
    if (selectedPayment === 'upi' && !upiId.trim()) {
      setUpiError('UPI ID is required.');
      return;
    }

    setIsProcessing(true);

    // Daily sequential kiosk order number
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const storageKey = 'kiosk_order_counter';
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
    let counter = 1;
    if (stored.date === today) {
      counter = (stored.count || 0) + 1;
    }
    localStorage.setItem(storageKey, JSON.stringify({ date: today, count: counter }));
    const orderId = `KIOSK-${String(counter).padStart(3, '0')}`;

    // Simulate payment processing
    setTimeout(() => {
      const order: Order = {
        id: orderId,
        items: cart,
        subtotal,
        tax,
        total,
        status: 'preparing',
        type: 'takeaway', // Kiosk orders are always counter pickup
        date: new Date().toISOString(),
        customerName: 'Kiosk Guest',
      };

      setIsProcessing(false);
      onCheckout(order);
    }, 2000);
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3E2723] to-[#5D4037] text-white py-4 px-4 sm:px-6 shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <button onClick={onBackToMenu} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Your Cart</h1>
              <p className="text-white/70 text-xs">Review & place your kiosk order</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 bg-[#FAF0E4] rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-10 h-10 text-[#C8A47A]" />
          </div>
          <h2 className="text-xl font-bold text-[#3E2723] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Your cart is empty
          </h2>
          <p className="text-gray-500 text-sm mb-6 text-center">Add some delicious items from the menu</p>
          <button
            onClick={onBackToMenu}
            className="px-8 py-3 bg-gradient-to-r from-[#8B5A2B] to-[#C8A47A] text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all active:scale-95"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E2723] to-[#5D4037] text-white py-4 px-4 sm:px-6 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={onBackToMenu} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Your Cart</h1>
            <p className="text-white/70 text-xs">{cart.length} item{cart.length !== 1 ? 's' : ''} • Counter Pickup</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-32">
        {/* Cart Items */}
        <div className="space-y-3 mb-8">
          {cart.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-[#E8D5B5] p-3 flex gap-3 shadow-sm">
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <MenuItemImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                      </div>
                      <h3 className="font-semibold text-[#3E2723] text-sm truncate">{item.name}</h3>
                    </div>
                    {item.spiceLevel && (
                      <p className="text-xs text-gray-400 capitalize">{item.spiceLevel} spice</p>
                    )}
                    {item.addons && item.addons.length > 0 && (
                      <p className="text-xs text-[#C8A47A]">{item.addons.join(', ')}</p>
                    )}
                  </div>
                  <button onClick={() => onRemoveItem(item.id)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 bg-[#FAF0E4] rounded-lg">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8B5A2B] hover:bg-[#E8D5B5] transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-bold text-[#3E2723] text-sm">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8B5A2B] hover:bg-[#E8D5B5] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-bold text-[#8B5A2B] text-sm">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl border border-[#E8D5B5] p-4 mb-6 shadow-sm">
          <h3 className="font-bold text-[#3E2723] mb-3 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
            Order Summary
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST (5%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-[#E8D5B5] pt-2 flex justify-between font-bold text-[#3E2723]">
              <span>Total</span>
              <span className="text-[#8B5A2B]">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Order Type Info */}
        <div className="bg-[#FAF0E4] rounded-xl p-4 mb-6 border border-[#E8D5B5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8B5A2B] rounded-full flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#3E2723] text-sm">Counter Pickup</p>
              <p className="text-xs text-[#8B5A2B]/70">Your order will be ready for pickup at the counter</p>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-xl border border-[#E8D5B5] p-4 mb-6 shadow-sm">
          <h3 className="font-bold text-[#3E2723] mb-3 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
            Payment Method
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setSelectedPayment('upi'); setUpiError(null); }}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                selectedPayment === 'upi'
                  ? 'border-[#8B5A2B] bg-[#FAF0E4]'
                  : 'border-[#E8D5B5] hover:border-[#C8A47A] hover:bg-[#FAF0E4]/50'
              }`}
            >
              <Smartphone className="w-6 h-6 text-[#8B5A2B]" />
              <span className="text-sm font-semibold text-[#3E2723]">UPI</span>
            </button>
            <button
              onClick={() => { setSelectedPayment('card'); setUpiError(null); }}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                selectedPayment === 'card'
                  ? 'border-[#8B5A2B] bg-[#FAF0E4]'
                  : 'border-[#E8D5B5] hover:border-[#C8A47A] hover:bg-[#FAF0E4]/50'
              }`}
            >
              <CreditCard className="w-6 h-6 text-[#8B5A2B]" />
              <span className="text-sm font-semibold text-[#3E2723]">Card</span>
            </button>
          </div>

          {/* UPI Input */}
          {selectedPayment === 'upi' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-[#3E2723] mb-1">UPI ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => { setUpiId(e.target.value); setUpiError(null); }}
                placeholder="yourname@upi"
                className="w-full px-3 py-2.5 border border-[#E8D5B5] rounded-lg text-sm text-[#3E2723] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A47A]"
              />
              {upiError && <p className="text-red-500 text-xs mt-1">{upiError}</p>}
            </div>
          )}

          {/* Card Input (simulated) */}
          {selectedPayment === 'card' && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#3E2723] mb-1">Card Number</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-3 py-2.5 border border-[#E8D5B5] rounded-lg text-sm text-[#3E2723] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A47A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#3E2723] mb-1">Expiry</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full px-3 py-2.5 border border-[#E8D5B5] rounded-lg text-sm text-[#3E2723] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A47A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3E2723] mb-1">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full px-3 py-2.5 border border-[#E8D5B5] rounded-lg text-sm text-[#3E2723] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A47A]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Pay Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8D5B5] p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handlePayment}
            disabled={!selectedPayment || isProcessing}
            className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
              selectedPayment && !isProcessing
                ? 'bg-gradient-to-r from-[#8B5A2B] to-[#C8A47A] text-white hover:shadow-lg active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                Pay ₹{total.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
