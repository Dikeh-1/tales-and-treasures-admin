import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { type AxiosError } from 'axios';
import {
  Typography,
  Box,
  Paper,
  Button,
  Chip,
  Avatar,
  useTheme,
  useMediaQuery,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Container,
  Stack,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Fade,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Badge
} from '@mui/material';
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import MailIcon from '@mui/icons-material/Mail';
import DraftsIcon from '@mui/icons-material/Drafts';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import MessageViewModal from '../components/MessageViewModal';
import LoadingOverlay from '../components/LoadingOverlay';

type Message = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function MessagesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Modals
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<number | null>(null);

  // Menus
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/messages');
      const normalizedRows = Array.isArray(response.data)
        ? response.data.map((message: any) => ({
            ...message,
            isRead: Boolean(message.isRead ?? message.read),
          }))
        : [];
      setMessages(normalizedRows);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch messages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // --- Filtering Logic ---
  const filteredMessages = useMemo(() => {
    let data = messages;

    // Filter by Status
    if (filter === 'unread') data = data.filter(m => !m.isRead);
    if (filter === 'read') data = data.filter(m => m.isRead);

    // Filter by Search
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      data = data.filter(m =>
        m.name.toLowerCase().includes(lowerQ) ||
        m.subject.toLowerCase().includes(lowerQ) ||
        m.email.toLowerCase().includes(lowerQ)
      );
    }
    return data;
  }, [messages, filter, searchQuery]);

  // --- Handlers ---

  const handleMarkAsRead = async (id: number, isRead: boolean) => {
    if (!Number.isFinite(id)) {
      toast.error('Invalid message selected.');
      return;
    }

    // Close menu first
    setActionMenuAnchor(null);
    setActionMessage(null);

    try {
      await apiClient.patch(`/messages/${id}`, { read: isRead });
      toast.success(isRead ? 'Marked as read' : 'Marked as unread');
      
      // Update local state immediately for snappy feel
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead } : m));
      
      // Also update the selected message if it's open in modal
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, isRead } : null);
      }
    } catch (error) {
      try {
        // Backward-compatible fallback if API expects `isRead`.
        await apiClient.patch(`/messages/${id}`, { isRead });
        toast.success(isRead ? 'Marked as read' : 'Marked as unread');
        setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead } : m));
        if (selectedMessage?.id === id) {
          setSelectedMessage(prev => prev ? { ...prev, isRead } : null);
        }
      } catch (fallbackError: unknown) {
        console.error(fallbackError);
        const apiError = fallbackError as AxiosError<{
          message?: string | string[];
          error?: string;
        }>;
        const apiMessage = Array.isArray(apiError.response?.data?.message)
          ? apiError.response?.data?.message.join(', ')
          : apiError.response?.data?.message || apiError.response?.data?.error;
        toast.error(
          typeof apiMessage === 'string'
            ? apiMessage
            : 'Failed to update status.',
        );
      }
    }
  };

  const handleDelete = async () => {
    if (messageToDelete !== null) {
      setDeleteModalOpen(false);
      const toastId = toast.loading('Deleting message...');
      try {
        await apiClient.delete(`/messages/${messageToDelete}`);
        toast.success('Message deleted.', { id: toastId });
        setMessages(prev => prev.filter(m => m.id !== messageToDelete));
        if (selectedMessage?.id === messageToDelete) {
            setViewModalOpen(false);
            setSelectedMessage(null);
        }
      } catch (error) {
        toast.error('Delete failed.', { id: toastId });
      } finally {
        setMessageToDelete(null);
      }
    }
  };

  const handleViewMessage = async (message: Message) => {
    setSelectedMessage(message);
    setViewModalOpen(true);
    
    // Auto mark as read if unread
    if (!message.isRead) {
      try {
        await apiClient.patch(`/messages/${message.id}`, { read: true });
        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, isRead: true } : m));
      } catch (err) {
        try {
          await apiClient.patch(`/messages/${message.id}`, { isRead: true });
          setMessages(prev => prev.map(m => m.id === message.id ? { ...m, isRead: true } : m));
        } catch (fallbackError) {
          console.error("Failed to auto-mark read", fallbackError);
        }
      }
    }
  };

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, message: Message) => {
    event.stopPropagation();
    setActionMessage(message);
    setActionMenuAnchor(event.currentTarget);
  };

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Container maxWidth="xl" sx={{ p: { xs: 2, md: 3 }, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {loading && <LoadingOverlay message="Syncing Messages..." />}

      {/* --- Header --- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ 
            background: 'linear-gradient(45deg, #EC4899, #8B5CF6)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            Inbox
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Read and manage contact form submissions
          </Typography>
        </Box>
      </Box>

      {/* --- Controls Toolbar --- */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 1, 
          mb: 3, 
          borderRadius: 3, 
          border: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          gap: 2
        }}
      >
        <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Button 
                variant={filter === 'all' ? 'contained' : 'text'} 
                onClick={() => setFilter('all')}
                size="small"
                sx={{ borderRadius: 2, px: 2 }}
            >
                All
            </Button>
            <Button 
                variant={filter === 'unread' ? 'contained' : 'text'} 
                onClick={() => setFilter('unread')}
                size="small"
                color="primary"
                sx={{ borderRadius: 2, px: 2 }}
            >
                Unread
            </Button>
            <Button 
                variant={filter === 'read' ? 'contained' : 'text'} 
                onClick={() => setFilter('read')}
                size="small"
                color="inherit"
                sx={{ borderRadius: 2, px: 2 }}
            >
                Read
            </Button>
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        <TextField
          size="small"
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: { xs: '100%', sm: 250 } }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon color="action" fontSize="small" /></InputAdornment>,
            sx: { borderRadius: 2 }
          }}
        />
      </Paper>

      {/* --- Content Area --- */}
      <Paper 
        elevation={0} 
        sx={{ 
            flexGrow: 1, 
            width: '100%', 
            border: `1px solid ${theme.palette.divider}`, 
            borderRadius: 3, 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper'
        }}
      >
        <List sx={{ width: '100%', p: 0, overflowY: 'auto', flexGrow: 1 }}>
            {filteredMessages.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8, opacity: 0.6 }}>
                    <DraftsIcon sx={{ fontSize: 48, mb: 1 }} />
                    <Typography>No messages found.</Typography>
                </Box>
            )}
            
            {filteredMessages.map((message, index) => (
                <React.Fragment key={message.id}>
                    <ListItem 
                        alignItems="flex-start"
                        sx={{ 
                            cursor: 'pointer',
                            bgcolor: message.isRead ? 'transparent' : 'action.hover',
                            transition: 'background-color 0.2s',
                            '&:hover': { bgcolor: 'action.selected' },
                            pr: 8 // Space for action button
                        }}
                        onClick={() => handleViewMessage(message)}
                        secondaryAction={
                            <IconButton edge="end" onClick={(e) => handleActionMenuOpen(e, message)}>
                                <MoreVertIcon />
                            </IconButton>
                        }
                    >
                        <ListItemAvatar>
                            <Badge
                                overlap="circular"
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                badgeContent={!message.isRead ? <CheckCircleIcon color="primary" sx={{ fontSize: 16, bgcolor: 'white', borderRadius: '50%' }} /> : null}
                            >
                                <Avatar sx={{ bgcolor: message.isRead ? 'grey.400' : 'primary.main' }}>
                                    {getInitials(message.name)}
                                </Avatar>
                            </Badge>
                        </ListItemAvatar>
                        <ListItemText
                            primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography 
                                        variant="subtitle1" 
                                        fontWeight={message.isRead ? 500 : 700} 
                                        noWrap 
                                        sx={{ maxWidth: '70%' }}
                                    >
                                        {message.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                        {getTimeAgo(message.createdAt)}
                                    </Typography>
                                </Box>
                            }
                            secondary={
                                <Box>
                                    <Typography 
                                        variant="body2" 
                                        color="text.primary" 
                                        fontWeight={message.isRead ? 400 : 600} 
                                        noWrap
                                        sx={{ mb: 0.5 }}
                                    >
                                        {message.subject}
                                    </Typography>
                                    <Typography 
                                        variant="body2" 
                                        color="text.secondary" 
                                        noWrap
                                    >
                                        {message.message}
                                    </Typography>
                                </Box>
                            }
                        />
                    </ListItem>
                    {index < filteredMessages.length - 1 && <Divider component="li" />}
                </React.Fragment>
            ))}
        </List>
      </Paper>

      {/* --- Action Menu --- */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 160, boxShadow: 3 } }}
      >
        {actionMessage?.isRead ? (
            <MenuItem onClick={() => handleMarkAsRead(actionMessage.id, false)}>
                <MarkEmailUnreadIcon fontSize="small" sx={{ mr: 1.5, color: 'primary.main' }} /> Mark as Unread
            </MenuItem>
        ) : (
            <MenuItem onClick={() => handleMarkAsRead(actionMessage!.id, true)}>
                <MarkEmailReadIcon fontSize="small" sx={{ mr: 1.5, color: 'success.main' }} /> Mark as Read
            </MenuItem>
        )}
        
        <Divider />
        
        <MenuItem onClick={() => { setMessageToDelete(actionMessage!.id); setDeleteModalOpen(true); setActionMenuAnchor(null); }} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Delete Message
        </MenuItem>
      </Menu>

      {/* --- View Modal --- */}
      <MessageViewModal 
        open={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        message={selectedMessage} 
        onDelete={() => {
            if (selectedMessage) {
                setMessageToDelete(selectedMessage.id);
                setDeleteModalOpen(true);
                // View modal stays open until delete confirmed
            }
        }}
      />

      {/* --- Delete Confirm Dialog --- */}
      <Dialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle fontWeight={700}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete this message?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteModalOpen(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" sx={{ borderRadius: 2 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
