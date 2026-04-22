import { Dialog, DialogTitle, DialogContent, Typography, Box, DialogActions, Button } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// Define the shape of the event object we expect
interface Event {
  title: string;
  start: Date;
  end: Date;
  resource?: string;
}

interface EventDetailsModalProps {
  open: boolean;
  onClose: () => void;
  event: Event | null;
}

export default function EventDetailsModal({ open, onClose, event }: EventDetailsModalProps) {
  if (!event) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <EventIcon sx={{ mr: 1, color: event.resource === 'bookClub' ? '#38BDF8' : '#16A34A' }} />
        {event.title}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <AccessTimeIcon sx={{ mr: 1.5, color: 'text.secondary' }} />
          <Box>
            <Typography variant="body1">{formatDate(event.start)}</Typography>
            <Typography variant="body2" color="text.secondary">
              {formatTime(event.start)} – {formatTime(event.end)}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}