import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, Button, Paper, LinearProgress } from '@mui/material';
import { Timer } from 'lucide-react';

interface InactivityWarningModalProps {
  open: boolean;
  onStayLoggedIn: () => void;
  onLogout: () => void;
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
  borderRadius: 2,
  textAlign: 'center',
};

export default function InactivityWarningModal({ open, onStayLoggedIn, onLogout }: InactivityWarningModalProps) {
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (open) {
      setCountdown(60); // Reset countdown when modal opens
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onLogout(); // Logout when timer finishes
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [open, onLogout]);

  const progress = (countdown / 60) * 100;

  return (
    <Modal open={open}>
      <Paper sx={style}>
        <Timer size={48} style={{ marginBottom: '16px', color: '#f59e0b' }} />
        <Typography variant="h6" component="h2">
          Are you still there?
        </Typography>
        <Typography sx={{ mt: 2 }}>
          For your security, you will be logged out in...
        </Typography>
        <Typography variant="h4" component="p" sx={{ my: 2 }}>
          {countdown} seconds
        </Typography>
        <LinearProgress variant="determinate" value={progress} />
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outlined" onClick={onLogout}>
            Logout Now
          </Button>
          <Button variant="contained" onClick={onStayLoggedIn}>
            Stay Logged In
          </Button>
        </Box>
      </Paper>
    </Modal>
  );
}