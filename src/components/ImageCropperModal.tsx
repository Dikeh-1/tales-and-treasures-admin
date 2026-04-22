import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Modal, Box, Slider, Button, Typography, Paper } from '@mui/material';
import { getCroppedImg } from '../utils/cropImage'; // We will create this utility soon

interface ImageCropperModalProps {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedImageFile: File) => void;
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 450, md: 600 },
  maxHeight: '90vh',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  outline: 'none',
};

export default function ImageCropperModal({ open, imageSrc, onClose, onCropComplete }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = useCallback((crop) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteCallback = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (imageSrc && croppedAreaPixels) {
      try {
        const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
        onCropComplete(croppedFile);
        onClose();
      } catch (e) {
        console.error('Error cropping image:', e);
        // Optionally show a toast error
      }
    }
  };

  if (!imageSrc) return null; // Don't render if no image is selected

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="image-cropper-modal-title">
      <Paper sx={style}>
        <Typography id="image-cropper-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
          Crop Image (Headshot)
        </Typography>
        <Box sx={{ position: 'relative', width: '100%', height: 300, bgcolor: 'grey.200', mb: 2 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1} // Square aspect ratio for headshot
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            cropShape="round" // Round crop shape for profile picture
            showGrid={false}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography>Zoom:</Typography>
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="zoom-slider"
            onChange={(e, val) => onZoomChange(val as number)}
            sx={{ flexGrow: 1 }}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleCrop}>
            Crop & Upload
          </Button>
        </Box>
      </Paper>
    </Modal>
  );
}