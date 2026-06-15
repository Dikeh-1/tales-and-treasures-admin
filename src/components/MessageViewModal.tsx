import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  IconButton,
  Avatar,
  Divider,
  useTheme,
  useMediaQuery,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

interface Message {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  createdAt: string;
}

interface MessageViewModalProps {
  open: boolean;
  onClose: () => void;
  message: Message | null;
  onDelete: () => void;
}

export default function MessageViewModal({ open, onClose, message, onDelete }: MessageViewModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!message) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          height: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : '90vh'
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" fontWeight={700} noWrap sx={{ maxWidth: '80%' }}>
          {message.subject}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, md: 4 }, bgcolor: 'background.default' }}>
        
        {/* Sender Info Card */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main', mr: 2 }}>
                    {getInitials(message.name)}
                </Avatar>
                <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                        {message.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', color: 'text.secondary', mt: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <EmailIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption">
                                {message.email}
                            </Typography>
                        </Box>
                        {message.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PhoneIcon sx={{ fontSize: 14 }} />
                                <Typography variant="caption">
                                    {message.phone}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <CalendarTodayIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">
                    Received on {formatDate(message.createdAt)}
                </Typography>
            </Box>
        </Paper>

        {/* Message Body */}
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'text.primary' }}>
          {message.message}
        </Typography>
        
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
          Close
        </Button>
        <Button 
            onClick={onDelete} 
            variant="contained" 
            color="error" 
            startIcon={<DeleteIcon />}
            sx={{ borderRadius: 2 }}
        >
          Delete Message
        </Button>
      </DialogActions>
    </Dialog>
  );
}