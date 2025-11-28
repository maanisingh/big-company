import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Alert, Space, Typography, Radio, message } from 'antd';
import {
  CameraOutlined,
  ScanOutlined,
  CloseOutlined,
  SwapOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

const { Text } = Typography;

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  buttonText?: string;
  buttonIcon?: React.ReactNode;
}

export const BarcodeScanner = ({
  onScan,
  buttonText = 'Scan Barcode',
  buttonIcon = <CameraOutlined />,
}: BarcodeScannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanRegionId = 'barcode-scanner-region';

  // Get available cameras
  const getCameras = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        // Prefer back camera if available
        const backCamera = devices.find(
          (d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
        );
        setSelectedCamera(backCamera?.id || devices[0].id);
        setError(null);
      } else {
        setError('No cameras found on this device');
      }
    } catch (err: any) {
      console.error('Error getting cameras:', err);
      setError('Unable to access camera. Please allow camera permissions.');
    }
  }, []);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      getCameras();
    }
    return () => {
      stopScanning();
    };
  }, [isOpen, getCameras]);

  // Start scanning
  const startScanning = async () => {
    if (!selectedCamera) {
      setError('No camera selected');
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      // Create scanner instance
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scanRegionId);
      }

      // Configure scanner for barcodes
      const config = {
        fps: 10,
        qrbox: { width: 300, height: 150 },
        aspectRatio: 1.777,
        formatsToSupport: [
          0, // QR_CODE
          1, // AZTEC
          2, // CODABAR
          3, // CODE_39
          4, // CODE_93
          5, // CODE_128
          6, // DATA_MATRIX
          7, // MAXICODE
          8, // ITF
          9, // EAN_13
          10, // EAN_8
          11, // PDF_417
          12, // RSS_14
          13, // RSS_EXPANDED
          14, // UPC_A
          15, // UPC_E
          16, // UPC_EAN_EXTENSION
        ],
      };

      await scannerRef.current.start(
        selectedCamera,
        config,
        (decodedText) => {
          // Avoid duplicate scans
          if (decodedText !== lastScanned) {
            setLastScanned(decodedText);
            message.success(`Scanned: ${decodedText}`);
            onScan(decodedText);

            // Auto-close after successful scan
            setTimeout(() => {
              handleClose();
            }, 500);
          }
        },
        (errorMessage) => {
          // Ignore QR not found errors (happens continuously while scanning)
          if (!errorMessage.includes('No QR code found') &&
              !errorMessage.includes('No barcode') &&
              !errorMessage.includes('NotFoundException')) {
            console.warn('Scan warning:', errorMessage);
          }
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(
        err.message || 'Failed to start camera. Please check permissions.'
      );
    } finally {
      setIsInitializing(false);
    }
  };

  // Stop scanning
  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
    setIsScanning(false);
  };

  // Switch camera
  const switchCamera = async () => {
    const currentIndex = cameras.findIndex((c) => c.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];

    if (nextCamera) {
      await stopScanning();
      setSelectedCamera(nextCamera.id);

      // Restart with new camera
      setTimeout(() => {
        if (isOpen) startScanning();
      }, 100);
    }
  };

  // Handle modal close
  const handleClose = () => {
    stopScanning();
    setIsOpen(false);
    setError(null);
    setLastScanned(null);
  };

  // Handle modal open
  const handleOpen = () => {
    setIsOpen(true);
    setLastScanned(null);
  };

  return (
    <>
      <Button
        type="primary"
        icon={buttonIcon}
        onClick={handleOpen}
        style={{ backgroundColor: '#10b981' }}
      >
        {buttonText}
      </Button>

      <Modal
        title={
          <Space>
            <ScanOutlined />
            Scan Barcode with Camera
          </Space>
        }
        open={isOpen}
        onCancel={handleClose}
        footer={null}
        width={500}
        destroyOnClose
        centered
      >
        <div style={{ textAlign: 'center' }}>
          {/* Error display */}
          {error && (
            <Alert
              message="Camera Error"
              description={error}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              action={
                <Button size="small" onClick={getCameras}>
                  Retry
                </Button>
              }
            />
          )}

          {/* Camera selection */}
          {cameras.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <Radio.Group
                value={selectedCamera}
                onChange={(e) => {
                  stopScanning();
                  setSelectedCamera(e.target.value);
                }}
                size="small"
              >
                {cameras.map((camera) => (
                  <Radio.Button key={camera.id} value={camera.id}>
                    {camera.label.includes('back') || camera.label.includes('rear')
                      ? 'Back Camera'
                      : camera.label.includes('front')
                      ? 'Front Camera'
                      : camera.label.substring(0, 20)}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </div>
          )}

          {/* Scanner region */}
          <div
            id={scanRegionId}
            style={{
              width: '100%',
              minHeight: 280,
              backgroundColor: '#1a1a1a',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {!isScanning && !isInitializing && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <CameraOutlined
                  style={{ fontSize: 48, color: '#666', marginBottom: 16 }}
                />
                <Text
                  style={{ display: 'block', color: '#999', marginBottom: 16 }}
                >
                  Camera preview will appear here
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Point camera at barcode to scan
                </Text>
              </div>
            )}
            {isInitializing && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <LoadingOutlined
                  style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }}
                />
                <Text style={{ display: 'block', color: '#999' }}>
                  Initializing camera...
                </Text>
              </div>
            )}
          </div>

          {/* Instructions */}
          <Alert
            message="How to scan"
            description={
              <ul style={{ margin: 0, paddingLeft: 20, textAlign: 'left' }}>
                <li>Hold your phone steady</li>
                <li>Position the barcode within the scanning area</li>
                <li>Ensure good lighting</li>
                <li>Supports: EAN-13, UPC, Code128, QR codes</li>
              </ul>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16, textAlign: 'left' }}
          />

          {/* Control buttons */}
          <Space size="middle">
            {!isScanning ? (
              <Button
                type="primary"
                size="large"
                icon={isInitializing ? <LoadingOutlined /> : <CameraOutlined />}
                onClick={startScanning}
                disabled={!selectedCamera || !!error || isInitializing}
              >
                {isInitializing ? 'Starting...' : 'Start Camera'}
              </Button>
            ) : (
              <>
                <Button
                  size="large"
                  icon={<SwapOutlined />}
                  onClick={switchCamera}
                  disabled={cameras.length <= 1}
                >
                  Switch Camera
                </Button>
                <Button
                  type="primary"
                  danger
                  size="large"
                  icon={<CloseOutlined />}
                  onClick={stopScanning}
                >
                  Stop
                </Button>
              </>
            )}
          </Space>

          {/* Last scanned */}
          {lastScanned && (
            <div style={{ marginTop: 16 }}>
              <Text type="success" strong>
                Last scanned: {lastScanned}
              </Text>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default BarcodeScanner;
