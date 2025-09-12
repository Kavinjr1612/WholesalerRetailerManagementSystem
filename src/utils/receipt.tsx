import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';

interface ReceiptProps {
  retailerName: string;
  retailerAddress: string;
  retailerPhone: string;
  billingDate: string;
}

const Receipt: React.FC<ReceiptProps> = ({
  retailerName,
  retailerAddress,
  retailerPhone,
  billingDate,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const element = receiptRef.current;
    if (element) {
      const opt = {
        margin: 10,
        filename: `receipt.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          logging: true,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm',
          format: 'a5',
          orientation: 'portrait'
        }
      };

      html2pdf()
        .set(opt)
        .from(element)
        .save();
    }
  };

  // Format date to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  return (
    <div ref={receiptRef} style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      {/* Retailer Information */}
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          {retailerName}
        </h2>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          {retailerAddress}
        </p>
        <p style={{ margin: 0, fontSize: '14px' }}>
          Contact: {retailerPhone}
        </p>
      </div>

      {/* Thank You Message */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <p style={{ margin: '10px 0', fontSize: '16px' }}>
          Thank you for your purchase!
        </p>
        <p style={{ margin: 0, fontSize: '14px' }}>
          Date: {formatDate(billingDate)}
        </p>
      </div>

      <button
        onClick={handleDownload}
        style={{
          display: 'none', // Hidden button for programmatic download
        }}
      >
        Download Receipt
      </button>
    </div>
  );
};

export default Receipt;