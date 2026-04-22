import { Modal, Box, Typography, Button, Paper } from '@mui/material';

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
}

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 2
};

export default function ConfirmationModal({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  confirmColor = 'primary' 
}: ConfirmationModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <Paper sx={style}>
        <Typography variant="h6">{title}</Typography>
        <Typography sx={{ mt: 2 }}>{message}</Typography>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} sx={{ mr: 1 }}>Cancel</Button>
          <Button variant="contained" color={confirmColor} onClick={onConfirm}>
            {confirmText}
          </Button>
        </Box>
      </Paper>
    </Modal>
  );
}