import React from 'react';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://img.magnific.com/premium-vector/whatsapp-app-icon-popular-messenger-social-media-logo-vector-illustration_277909-406.jpg?semt=ais_hybrid&w=740&q=80" 
    alt="WhatsApp" 
    className={`${className || ''} object-contain rounded`}
    referrerPolicy="no-referrer"
  />
);

export default WhatsAppIcon;
