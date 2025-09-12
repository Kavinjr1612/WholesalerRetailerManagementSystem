import React from 'react';
import html2pdf from 'html2pdf.js';

interface ReceiptProps {
  retailerName: string;
  retailerAddress: string;
  retailerPhone: string;
  billingDate: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totalAmount: number;
}

const Receipt: React.FC<ReceiptProps> = ({
  retailerName,
  retailerAddress,
  retailerPhone,
  billingDate,
  items,
  totalAmount,
}) => {
  const handleDownload = () => {
    const element = document.getElementById('receipt');
    if (element) {
      const opt = {
        margin: 10,
        filename: `receipt_${billingDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      // Generate PDF
      html2pdf()
        .set(opt)
        .from(element)
        .toPdf()
        .get('pdf')
        .then((pdf) => {
          // Open print dialog
          pdf.autoPrint();
          window.open(pdf.output('bloburl'), '_blank');
        });
    }
  };

  return (
    <div id="receipt" className="p-6 bg-white rounded-lg shadow-md">
      {/* Retailer Information */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">{retailerName}</h1>
        <p className="text-sm text-gray-500">{retailerAddress}</p>
        <p className="text-sm text-gray-500">Contact: {retailerPhone}</p>
      </div>

      {/* Billing Date */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500">Date: {billingDate}</p>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <div className="flex justify-between border-b pb-2">
          <span className="font-bold">Product</span>
          <span className="font-bold">Quantity</span>
          <span className="font-bold">Unit Price</span>
          <span className="font-bold">Total</span>
        </div>
        {items.map((item, index) => (
          <div key={index} className="flex justify-between py-2 border-b">
            <span>{item.name}</span>
            <span>{item.quantity}</span>
            <span>₹{item.unitPrice.toFixed(2)}</span>
            <span>₹{item.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Total Amount */}
      <div className="flex justify-between font-bold pt-4">
        <span>Total</span>
        <span>₹{totalAmount.toFixed(2)}</span>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 mt-6">
        <p>Thank you for your purchase!</p>
      </div>

      {/* Download Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          Download Receipt
        </button>
      </div>
    </div>
  );
};

export default Receipt;