import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import '../styles/LoadingOverlay.css'; // You'll create this CSS file next

interface LoadingOverlayProps {
  message: string;
}

export default function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <Box className="loading-overlay">
      <CircularProgress color="inherit" />
      <Typography>{message}</Typography>
    </Box>
  );
}