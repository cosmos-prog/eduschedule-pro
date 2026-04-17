/**
 * EduSchedule Pro - Composant SignaturePad
 * Pad de signature numérique (signature_pad npm)
 */
import React, { useRef, useEffect, useCallback } from 'react';
import SignaturePadLib from 'signature_pad';
import { Button } from 'react-bootstrap';
import { FaEraser, FaCheck } from 'react-icons/fa';

const SignaturePad = ({ onSave, width = 500, height = 200, label = 'Signature' }) => {
  const canvasRef = useRef(null);
  const padRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      // Initialiser le pad
      padRef.current = new SignaturePadLib(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
      });

      // Adapter la taille du canvas
      const resizeCanvas = () => {
        const canvas = canvasRef.current;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext('2d').scale(ratio, ratio);
        padRef.current.clear();
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, []);

  // Effacer la signature
  const handleClear = useCallback(() => {
    if (padRef.current) {
      padRef.current.clear();
    }
  }, []);

  // Sauvegarder la signature en base64
  const handleSave = useCallback(() => {
    if (padRef.current) {
      if (padRef.current.isEmpty()) {
        alert('Veuillez signer avant de valider.');
        return;
      }
      const dataUrl = padRef.current.toDataURL('image/png');
      onSave(dataUrl);
    }
  }, [onSave]);

  return (
    <div className="signature-component">
      <label className="form-label fw-bold mb-2">{label}</label>
      <div className="signature-container mb-2">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: `${height}px`, touchAction: 'none' }}
        />
      </div>
      <div className="d-flex gap-2">
        <Button variant="outline-secondary" size="sm" onClick={handleClear}>
          <FaEraser className="me-1" /> Effacer
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          <FaCheck className="me-1" /> Valider la signature
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;
