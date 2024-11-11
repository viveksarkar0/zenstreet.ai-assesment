"use client";

import React, { useState, useEffect } from "react";
import {
  formatDate,
  DateSelectArg,
  EventClickArg,
  EventApi,
} from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Toast } from "./ui/toast";
import Image from "next/image";

const Calendar: React.FC = () => {
  const [currentEvents, setCurrentEvents] = useState<EventApi[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventApi[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<DateSelectArg | null>(null);
  const [scheduledTime, setScheduledTime] = useState<string>("");
 
  const [editEvent, setEditEvent] = useState<EventApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState<boolean>(false);

 
 
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Request notification permission
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          console.log("Notification permission granted.");
        } else {
          console.log("Notification permission denied.");
        }
      });

      const savedEvents = localStorage.getItem("events");
      if (savedEvents) {
        const events = JSON.parse(savedEvents);
        setCurrentEvents(events);
        setFilteredEvents(events);
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const scheduleNotifications = () => {
      const checkEventNotifications = () => {
        currentEvents.forEach((event) => {
          const currentTime = new Date().getTime(); // Current timestamp
          const eventStartTime = new Date(scheduledTime).getTime(); // Convert scheduledTime to timestamp
          
          // Ensure scheduledTime is valid before comparison
          if (!isNaN(eventStartTime)) {
            // Check if the scheduled time matches the current time (within a small range for precision)
            if (eventStartTime === currentTime) {
              triggerNotification(event);
            }
          } else {
            console.log("Invalid scheduledTime:", scheduledTime);
          }
        });
      };
  
      const interval = setInterval(checkEventNotifications, 5000); // Check every 5 seconds
      
      return () => clearInterval(interval);
    };
  
    return scheduleNotifications();
  }, [currentEvents, scheduledTime]); // Ensure the notifications are scheduled when events or scheduledTime change
   // Ensure the notifications are scheduled when events change
   useEffect(() => {
    console.log(`Scheduled Time: ${scheduledTime}`);
    if (scheduledTime) {
      const eventStartTime = new Date(scheduledTime).getTime();
      console.log(`Event Start Time: ${eventStartTime}`);
    }
  }, [scheduledTime]);
  
  
  const triggerNotification = (event: EventApi) => {
    if (Notification.permission === "granted") {
      const eventTitle = event.title ?? "Unknown Event"; // Default value if no title is provided
      new Notification("Event Reminder", {
        body: `Your event "${eventTitle}" is starting now!`,
      });
      setNotificationDialogOpen(true); // Open the dialog when the notification is triggered
    } else {
      console.log("Notification permission not granted or blocked.");
    }
  };

  const handleDateClick = (selected: DateSelectArg) => {
    setSelectedDate(selected);
    setEditEvent(null);
    setIsDialogOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const { event } = clickInfo;
    setEditEvent(event);
    setNewEventTitle(event.title);
    const startTime = event.start ? new Date(event.start).toISOString().slice(0, 16) : "";
  if (startTime) {
    setScheduledTime(startTime); // Ensure it's only set if it's a valid time
  }
    console.log("Scheduled Time Set:", scheduledTime);
    setSelectedDate(null);
    setPhoto(event.extendedProps?.photo || null);
    setVideo(event.extendedProps?.video || null);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("events", JSON.stringify(currentEvents));
      setFilteredEvents(
        currentEvents.filter(event =>
          event.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [currentEvents, searchQuery]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddOrEditEvent = (e: React.FormEvent) => {
    e.preventDefault();

    if (editEvent) {
      editEvent.setProp("title", newEventTitle);
      editEvent.setStart(scheduledTime ? new Date(scheduledTime) : editEvent.start ?? new Date());

      editEvent.setExtendedProp("photo", photo);
      editEvent.setExtendedProp("video", video);
      setCurrentEvents([...currentEvents]);
      toast({
        title: "Event Updated",
        description: "Your event has been updated successfully.",
      });
    } else if (newEventTitle && selectedDate) {
      const calendarApi = selectedDate.view.calendar;
      calendarApi.unselect();

      const newEvent = calendarApi.addEvent({
        id: `${Date.now()}-${newEventTitle}`,
        title: newEventTitle,
        start: scheduledTime ? new Date(scheduledTime) : selectedDate.start,
        end: selectedDate.end,
        allDay: selectedDate.allDay,
        extendedProps: {
          photo: photo,
          video: video,
        },
      });

      if (newEvent) {
        const timeUntilEvent = new Date(newEvent.start!).getTime() - new Date().getTime();
        if (timeUntilEvent > 0) {
          setTimeout(() => triggerNotification(newEvent), timeUntilEvent);
        }
      }

      toast({
        title: "Event Added",
        description: "Your new event has been added successfully.",
      });
    }

    handleCloseDialog();
  };

  const handleDeleteEvent = () => {
    if (editEvent) {
      editEvent.remove();
      setCurrentEvents([...currentEvents.filter(event => event.id !== editEvent.id)]);
      toast({ title: "Event Deleted", description: "The event has been deleted successfully." });
    }
    handleCloseDialog();
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setNewEventTitle("");
    setEditEvent(null);
    setScheduledTime("");
    setPhoto(null);
    setVideo(null);
  };

  return (
    <div>
      <div className="flex w-full px-10 justify-start items-start gap-8">
        <div className="w-3/12 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="py-10 text-2xl font-extrabold px-7">
            Calendar Events
          </div>
          <input
            type="text"
            placeholder="Search Events"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 p-2 rounded-md mb-4 w-full"
          />
          <ul className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-8 w-full rounded-md" />
            ) : filteredEvents.length <= 0 ? (
              <div className="italic text-center text-gray-400">
                No Events Present
              </div>
            ) : (
              filteredEvents.map((event: EventApi) => (
                <li
                  className="border border-gray-200 shadow p-4 rounded-lg text-blue-800 flex flex-col gap-2"
                  key={event.id}
                >
                  <div className="font-semibold text-lg">{event.title}</div>
                  <div className="text-slate-950 text-sm">
                    {formatDate(event.start!, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  {event.extendedProps?.photo && (
                    <Image
                      src={event.extendedProps.photo}
                      alt="Event"
                      width={100}
                      height={100}
                      className="mt-2 w-full h-32 object-cover rounded-md shadow-sm border border-gray-300"
                    />
                  )}
                  {event.extendedProps?.video && (
                    <video
                      src={event.extendedProps.video}
                      controls
                      className="mt-2 w-full h-32 object-cover rounded-md shadow-sm border border-gray-300"
                    />
                  )}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="w-9/12 mt-8">
          <FullCalendar
            height={"85vh"}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
            }}
            initialView="dayGridMonth"
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            select={handleDateClick}
            eventClick={handleEventClick}
            eventsSet={(events) => setCurrentEvents(events)}
            initialEvents={
              typeof window !== "undefined"
                ? JSON.parse(localStorage.getItem("events") || "[]")
                : []
            }
          />
           {notificationDialogOpen && (
        <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Event Notification</DialogTitle>
            </DialogHeader>
            <p>Your event is starting now!</p>
          </DialogContent>
        </Dialog>
      )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editEvent ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddOrEditEvent} className="space-y-4">
            <input
              type="text"
              placeholder="Event Title"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              className="border border-gray-300 p-2 rounded-md w-full"
              required
            />
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="border border-gray-300 p-2 rounded-md w-full"
            />
            <div className="flex space-x-4">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="border border-gray-300 p-2 rounded-md w-full"
              />
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                
                className="border border-gray-300 p-2 rounded-md w-full"
              />
            </div>
            {photo && (
              <Image
                src={photo}
                alt="Preview"
                width={100}
                height={100}
                className="mt-2 w-full h-32 object-cover rounded-md shadow-sm border border-gray-300"
              />
            )}
            {video && (
              <video
                src={video}
                controls 
                className="mt-2 w-full h-32 object-cover rounded-md shadow-sm border border-gray-300"
              />
            )}
            <div className="flex space-x-4">
              <button type="submit" className=" bg-green-600 rounded-md text-white px-2 py-3">
                {editEvent ? "Update Event" : "Add Event"}
              </button>
              {editEvent && (
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  className="bg-red-500 rounded-md text-white px-2 py-3"
                >
                  Delete Event
                </button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    


      <Toast />
    </div>
  );
};

export default Calendar;
