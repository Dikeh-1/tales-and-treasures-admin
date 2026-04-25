import { Dialog, DialogTitle, DialogContent, Typography, Box, DialogActions, Button } from '@mui/material';

export default function NewsletterDetailsModal({ open, onClose, newsletter }) {
  if (!newsletter) return null;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{newsletter.subject}</DialogTitle>
      <DialogContent dividers>
        {newsletter.mediaUrl && <Box component="img" src={newsletter.mediaUrl} sx={{ maxWidth: '100%', mb: 2, borderRadius: 1 }} />}
        <Box 
          sx={{ 
            mt: 2, 
            '& ul, & ol': { pl: 3, mb: 2 },
            '& p': { mb: 2 },
            fontSize: '1rem',
            lineHeight: 1.6,
            color: 'text.primary'
          }}
          dangerouslySetInnerHTML={{ __html: newsletter.content }} 
        />
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}