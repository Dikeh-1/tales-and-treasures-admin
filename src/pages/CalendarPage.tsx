import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import {
  Paper,
  Typography,
  useTheme,
  Button,
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import TodayIcon from '@mui/icons-material/Today';
import EventDetailsModal from '../components/EventDetailsModal';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// ✅ Localizer configuration
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function CalendarPage() {
  const theme = useTheme();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [loading, setLoading] = useState<boolean>(true);

  /** ✅ Fetch calendar data using apiClient */
  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: settings } = await apiClient.get('/settings');

      const eventsList: any[] = [];

      // ✅ Add Book Club next session event if available
      if (settings.bookClub_nextSession_date && settings.bookClub_nextSession_time) {
        const startDate = new Date(
          `${settings.bookClub_nextSession_date}T${settings.bookClub_nextSession_time}`
        );
        const endDate = new Date(startDate.getTime() + 90 * 60 * 1000);

        eventsList.push({
          title: `📚 Book Club: ${settings.bookClub_nextSession_title || 'Reading Session'}`,
          start: startDate,
          end: endDate,
          resource: 'bookClub',
        });
      }

      setEvents(eventsList);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load calendar events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  /** ✅ Handlers */
  const handleNavigate = useCallback((newDate: Date) => setDate(newDate), []);
  const handleView = useCallback((newView: View) => setView(newView), []);
  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleToday = () => {
    setDate(new Date());
    setView(Views.MONTH);
  };

  /** ✅ Custom styling for events */
  const eventPropGetter = useCallback(
    (event: any) => {
      return {
        style: {
          backgroundColor:
            event.resource === 'bookClub'
              ? theme.palette.secondary.main
              : theme.palette.primary.main,
          color: theme.palette.getContrastText(
            event.resource === 'bookClub'
              ? theme.palette.secondary.main
              : theme.palette.primary.main
          ),
          borderRadius: '8px',
          padding: '4px 8px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
          fontWeight: 'bold',
          fontSize: '0.85rem',
        },
      };
    },
    [theme]
  );

  if (loading) {
    return (
      <Box
        sx={{
          height: '80vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress size={30} color="primary" />
        <Typography variant="h6" color="text.secondary">
          Loading your events...
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        p: 3,
        height: '85vh',
        bgcolor: theme.palette.mode === 'dark' ? '#121212' : '#fff',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',

        '& .rbc-event, & .rbc-day-slot .rbc-background-event': {
          border: 'none',
          padding: '2px 5px',
          borderRadius: '6px',
          backgroundColor: theme.palette.primary.light,
          color: theme.palette.getContrastText(theme.palette.primary.light),
          fontWeight: 600,
        },
        '& .rbc-toolbar': {
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          rowGap: 1,
          mb: 2,
          '& .rbc-toolbar-label': {
            fontSize: theme.typography.h6.fontSize,
            fontWeight: 'bold',
            color: theme.palette.text.primary,
          },
          '& button': {
            color: theme.palette.text.secondary,
            fontWeight: 600,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          },
        },
        '& .rbc-header': {
          backgroundColor: 'transparent',
          borderColor: theme.palette.divider,
          color: theme.palette.text.primary,
          fontWeight: 'bold',
          padding: '10px 5px',
          textTransform: 'uppercase',
        },
        '& .rbc-today': {
          backgroundColor: theme.palette.action.selected,
        },
        '& .rbc-off-range-bg': {
          backgroundColor: theme.palette.action.disabledBackground,
        },
      }}
    >
      {/* Page Title */}
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontWeight: 700,
          color: theme.palette.text.primary,
          textAlign: 'left',
          mb: 2,
        }}
      >
        📅 Events & Book Club Calendar
      </Typography>

      {/* Today Button */}
      <Tooltip title="Go to Today">
        <IconButton
          onClick={handleToday}
          sx={{
            position: 'absolute',
            top: 24,
            right: 24,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
        >
          <TodayIcon />
        </IconButton>
      </Tooltip>

      {/* Calendar */}
      <Box sx={{ flexGrow: 1, borderRadius: '12px', overflow: 'hidden' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          date={date}
          view={view}
          onNavigate={handleNavigate}
          onView={handleView}
        />
      </Box>

      {/* Event Modal */}
      <EventDetailsModal open={isModalOpen} onClose={handleCloseModal} event={selectedEvent} />
    </Paper>
  );
}
