import { Dialog, DialogTitle, DialogContent, Typography, Box, DialogActions, Button } from '@mui/material';

export default function NewsletterDetailsModal({ open, onClose, newsletter }) {
  if (!newsletter) return null;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{newsletter.subject}</DialogTitle>
      <DialogContent dividers>
        {newsletter.mediaUrl && <Box component="img" src={newsletter.mediaUrl} sx={{ maxWidth: '100%', mb: 2, borderRadius: 1 }} />}
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{newsletter.content}</Typography>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}