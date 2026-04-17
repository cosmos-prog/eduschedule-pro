/**
 * EduSchedule Pro - Composant QRScanner
 * Scanner de QR-Code via la caméra (html5-qrcode)
 */
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Alert, Spinner } from 'react-bootstrap';

const QRScanner = ({ onScan, onError }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const isRunningRef = useRef(false); // suivi de l'état réel du scanner

  useEffect(() => {
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // QR-Code scanné avec succès
            if (isRunningRef.current) {
              isRunningRef.current = false;
              setScanning(false);
              html5QrCode.stop().catch(() => {});
              onScan(decodedText);
            }
          },
          () => {} // Ignorer les erreurs de scan en cours
        );

        isRunningRef.current = true;
        setScanning(true);
        setError(null);
      } catch (err) {
        isRunningRef.current = false;
        setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
        if (onError) onError(err);
      }
    };

    startScanner();

    // Nettoyage : on arrête seulement si le scanner tourne vraiment
    return () => {
      if (scannerRef.current && isRunningRef.current) {
        isRunningRef.current = false;
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      {!scanning && !error && (
        <div className="text-center py-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Initialisation de la caméra...</p>
        </div>
      )}

      <div id="qr-reader" style={{ width: '100%' }} />

      {scanning && (
        <p className="text-center text-muted mt-2" style={{ fontSize: '0.85rem' }}>
          Placez le QR-Code devant la caméra pour le scanner
        </p>
      )}
    </div>
  );
};

export default QRScanner;
