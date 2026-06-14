
import React from 'react';
import { Order, Settings } from '../types';

interface ReceiptProps {
  order: Order;
  settings: Settings | null;
}

export const Receipt: React.FC<ReceiptProps> = ({ order, settings }) => {
  return (
    <div className="bg-white p-4 sm:p-8 w-full max-w-[400px] border-4 border-slate-900 text-slate-900 font-sans" id="receipt-content">
      <div className="text-center mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter">XenonStore</h1>
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">Official Receipt</p>
      </div>
      
      <div className="border-t-2 border-b-2 border-slate-900 py-3 sm:py-4 mb-4 space-y-1 sm:space-y-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
        <div className="flex justify-between"><span>Order ID:</span><span className="font-mono">{order.id}</span></div>
        <div className="flex justify-between"><span>Purchase Date:</span><span>{new Date(order.createdAt).toLocaleString()}</span></div>
        <div className="flex justify-between"><span>Customer:</span><span>{order.customerName}</span></div>
        <div className="flex justify-between"><span>WhatsApp:</span><span>{order.customerPhone}</span></div>
        <div className="flex justify-between"><span>Payment Method:</span><span>{order.paymentMethod}</span></div>
      </div>

      <div className="mb-4 sm:mb-6 space-y-1 sm:space-y-2">
        <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-widest border-b border-slate-900 pb-1 mb-1 sm:mb-2">Order Details</h2>
        <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold">
          <span>{order.packageName}</span>
          <span>{order.diamonds} Diamonds</span>
        </div>
        <div className="text-[9px] sm:text-[10px] text-slate-500 mt-1">Player ID: {order.userId} (Game: Free Fire)</div>
        {order.paymentProofUrl && (
          <div className="mt-2">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-700">Payment Proof:</p>
            <img src={order.paymentProofUrl} crossOrigin="anonymous" alt="Receipt" className="w-12 h-12 sm:w-16 sm:h-16 object-cover mt-1 rounded border border-slate-900" />
          </div>
        )}
      </div>

      <div className="border-t-2 border-slate-900 pt-3 sm:pt-4 flex justify-between items-center text-base sm:text-lg font-black uppercase">
        <span>Total</span>
        <span>LKR {order.amount?.toLocaleString()}</span>
      </div>
      
      <div className="mt-4 sm:mt-8 text-center text-[7px] sm:text-[8px] text-slate-400 font-bold uppercase">
        Thank you for choosing XenonStore!
      </div>
    </div>
  );
};
