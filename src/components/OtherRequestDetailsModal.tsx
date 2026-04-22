import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  Chip,
  Avatar
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArticleIcon from '@mui/icons-material/Article';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SendIcon from '@mui/icons-material/Send';

interface Newsletter {
  id: number;
  subject: string;
  content: string;
  status: 'Draft' | 'Sent';
  sentAt?: string | null;
  createdAt: string;
}

interface NewsletterDetailsModalProps {
  open: boolean;
  onClose: () => void;
  newsletter: Newsletter | null;
}

export default function NewsletterDetailsModal({ open, onClose, newsletter }: NewsletterDetailsModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!newsletter) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden' }}>
            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                <ArticleIcon />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={700} noWrap>
                    Newsletter Preview
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    ID: #{newsletter.id}
                </Typography>
            </Box>
        </Box>
        <IconButton aria-label="close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, md: 4 } }}>
        <Box sx={{ mb: 4 }}>
            <Typography variant="h5" fontWeight={800} gutterBottom>
                {newsletter.subject}
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mt: 2 }}>
                <Chip 
                    label={newsletter.status} 
                    color={newsletter.status === 'Sent' ? 'success' : 'warning'} 
                    size="small"
                    sx={{ fontWeight: 600 }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                    <CalendarTodayIcon fontSize="small" />
                    <Typography variant="body2">
                        {newsletter.status === 'Sent' ? `Sent on ${formatDate(newsletter.sentAt || '')}` : `Created on ${formatDate(newsletter.createdAt)}`}
                    </Typography>
                </Box>
            </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: 'text.primary' }}>
          {newsletter.content}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose} size="large" sx={{ borderRadius: 2 }}>
          Close
        </Button>
        {/* Optionally add a "Send Now" button here if it's a draft */}
      </DialogActions>
    </Dialog>
  );
}