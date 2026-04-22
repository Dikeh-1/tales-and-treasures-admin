import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 128px)', // Adjust height to fill space below app bar
      }}
    >
      <Paper 
        elevation={3}
        sx={{
          p: 4,
          textAlign: 'center',
          maxWidth: '500px',
          borderRadius: 2
        }}
      >
        <AlertTriangle size={64} color="#f59e0b" />
        <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
          404 - Page Not Found
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Sorry, the page you are looking for does not exist. It might have been moved or deleted.
        </Typography>
        <Button 
          component={Link} 
          to="/" 
          variant="contained" 
          color="primary"
        >
          Go to Dashboard
        </Button>
      </Paper>
    </Box>
  );
};

export default NotFoundPage;