import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const auth = useAuth();
  
  // Show loading spinner while checking authentication state
  if (!auth.isInitialized) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }
  
  // Redirect to login if not authenticated
  if (!auth.token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}