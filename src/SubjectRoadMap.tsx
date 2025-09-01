import React, { useState, useEffect, useCallback } from "react";
import { getApiClient } from "./utils/apiAuth";
import "./SubjectRoadMap.css";
import Skeleton from "react-loading-skeleton";
import { SUBJECT_ROADMAP } from "./constants/constants";
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";
import { Modal, Accordion, Spinner } from "react-bootstrap";
import { TfiMenuAlt } from "react-icons/tfi";
import { PiMonitorPlayBold } from "react-icons/pi";
import { SlNotebook } from "react-icons/sl";
import { FcTodoList } from "react-icons/fc";
import { LiaLaptopCodeSolid } from "react-icons/lia";
import { useNavigate } from "react-router-dom";
import { CiSquareChevUp } from "react-icons/ci";
import { FaExclamationTriangle } from "react-icons/fa";
import { BsListTask } from "react-icons/bs";
import { useAPISWR } from "./utils/swrConfig";
// import backend_response from './response.json';
interface NoteSection {
  heading: string;
  content: string;
}

interface Notes {
  title: string;
  sections: NoteSection[];
}

interface MCQOption {
  id: string;
  text: string;
}

interface MCQQuestion {
  shuffledOptions: any;
  questionId: string;
  status: boolean;
  score: string;
  level: string;
  question: string;
  options: string[];
  correct_answer: string;
  Explanation?: string;
  Qn_name: string;
  entered_ans: string;
}

interface CodingQuestion {
  id: number;
  question: string;
  score: string;
  isSolved: boolean;
}

interface VideoLesson {
  otp: string;
  playback_info: string;
}

interface NoteContent {
  content: string;
}

interface NoteData {
  id: number;
  content: string;
}

interface SubTopic {
  subtopicid: string;
  sub_topic: string;
  lesson: (number | VideoLesson)[]; // Can be array of video IDs or array of video objects
  notes: number[];
  mcqQuestions: number;
  codingQuestions: number;
}

interface Chapter {
  Day: string;
  title: string;
  duration: string;
  sub_topic_data: SubTopic[];
}

const SubjectRoadMap: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [disablePreviousBtn, setDisablePreviousBtn] = useState<boolean>(true);
  const [disableStatusNextBtn, setDisableStatusNextBtn] =
    useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [codingQuestions, setCodingQuestions] = useState<CodingQuestion[]>([]);
  const [notesData, setNotesData] = useState<{ [key: number]: NoteData }>({});
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<number | null>(null);
  const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(
    encryptedStudentId!,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const encryptedSubjectId = sessionStorage.getItem("SubjectId");
  const decryptedSubjectId = CryptoJS.AES.decrypt(
    encryptedSubjectId!,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const subjectId = decryptedSubjectId;
  const encryptedSubject = sessionStorage.getItem("Subject");
  const decryptedSubject = CryptoJS.AES.decrypt(
    encryptedSubject!,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const subject = decryptedSubject;
  const encryptedDayNumber = sessionStorage.getItem("DayNumber");
  const decryptedDayNumber = CryptoJS.AES.decrypt(
    encryptedDayNumber!,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const dayNumber = decryptedDayNumber;
  const encryptedWeekNumber = sessionStorage.getItem("WeekNumber");
  const decryptedWeekNumber = CryptoJS.AES.decrypt(
    encryptedWeekNumber!,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const weekNumber = decryptedWeekNumber;
  const [hasFetched, setHasFetched] = useState(false);
  const [modalMessage, setModalMessage] = useState<string>("");
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [unlockedSubtopics, setUnlockedSubtopics] = useState<Set<string>>(
    new Set()
  );
  const [currentView, setCurrentView] = useState<
    "lesson" | "mcq" | "coding" | "notes"
  >("lesson");
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [contentType, setContentType] = useState<"notes" | "pdf" | "ppt">(
    "notes"
  );
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: string]: string;
  }>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(
    new Set()
  );
  const [currentSubTopicIndex, setCurrentSubTopicIndex] = useState(0);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentMCQIndex, setCurrentMCQIndex] = useState(0);
  const [currentNotesIndex, setCurrentNotesIndex] = useState(0);
  const [submittedAnswers, setSubmittedAnswers] = useState<{
    [key: string]: boolean;
  }>({});
  const [isActive, setIsActive] = useState<boolean>(true);
  const [currentContentType, setCurrentContentType] = useState<
    "lesson" | "notes" | "mcq" | "coding"
  >("lesson");
  const [mcqInteracted, setMcqInteracted] = useState<{
    [key: string]: boolean;
  }>({});
  const [videoData, setVideoData] = useState<{
    [key: number]: { otp: string; playback_info: string };
  }>({});
  
  // VdoCipher time tracking state
  const [videoTimeTracking, setVideoTimeTracking] = useState<{
    totalPlayed: number;
    totalCovered: number;
    isTracking: boolean;
  }>({
    totalPlayed: 0,
    totalCovered: 0,
    isTracking: false
  });

  // Store video time in localStorage for App.tsx to access
  useEffect(() => {
    if (videoTimeTracking.isTracking && currentVideoId) {
      const videoTrackingData = {
        videoId: currentVideoId,
        totalPlayed: videoTimeTracking.totalPlayed,
        timestamp: Date.now()
      };
      localStorage.setItem('currentVideoTracking', JSON.stringify(videoTrackingData));
    }
  }, [videoTimeTracking.totalPlayed, videoTimeTracking.isTracking, currentVideoId]);
  
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const decryptedCourseId = CryptoJS.AES.decrypt(
    sessionStorage.getItem("CourseId")!,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const decryptedBatchId = CryptoJS.AES.decrypt(
    sessionStorage.getItem("BatchId")!,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const [incompleteSubtopics, setIncompleteSubtopics] = useState<string[]>([]);
  // Helper function to build video URL from lesson data

  // Centralized function to handle status API calls
  const updateLessonStatus = async (status: boolean) => {
    const statusUrl = `${process.env.REACT_APP_BACKEND_URL}api/student/lessons/status/`;
    try {
      const response = await getApiClient().post(statusUrl, {
        student_id: studentId,
        subject: subject,
        subject_id: subjectId,
        day_number: dayNumber,
        week_number: weekNumber,
        sub_topic: sessionStorage.getItem("currentSubTopicId") || "",
        status: status,
        batch_id: decryptedBatchId,
      });

      // Update incomplete subtopics from the response
      if (response.data && response.data.incomplete_sub_topics) {
        setIncompleteSubtopics(response.data.incomplete_sub_topics);

        // Show incomplete subtopics message in existing modal if there are incomplete subtopics
        if (response.data.incomplete_sub_topics.length > 0) {
          const count = response.data.incomplete_sub_topics.length;

          // Get subtopic names from the chapters data
          let subtopicNames: string[] = [];
          if (chapters.length > 0) {
            subtopicNames = response.data.incomplete_sub_topics
              .map((subtopicId: string) => {
                const subtopic = chapters[0].sub_topic_data.find(
                  (st: SubTopic) => st.subtopicid === subtopicId
                );
                return subtopic ? subtopic.sub_topic : subtopicId;
              })
              .filter((name: string, index: number) => {
                const originalId = response.data.incomplete_sub_topics[index];
                return name !== originalId; // Filter out IDs that couldn't be mapped to names
              });
          }

          let message = `You have not completed ${count} ${
            count === 1 ? "subtopic" : "subtopics"
          }`;

          // Add subtopic names if available
          if (subtopicNames.length > 0) {
            if (subtopicNames.length === 1) {
              message += `: ${subtopicNames[0]}`;
            } else {
              message += `: ${subtopicNames.join(", ")}`;
            }
          }

          setModalMessage(message);
          setShowUpdateModal(true);
        }
      } else {
        setIncompleteSubtopics([]);
      }

      return response.data;
    } catch (error: any) {
      console.error("Error updating lesson status:", error);
      throw error;
    }
  };

  const fetchVideoData = async (
    videoId: number
  ): Promise<{ otp: string; playback_info: string }> => {
    try {
      const response = await getApiClient().get(
        `${process.env.REACT_APP_BACKEND_URL}api/student/videos/${videoId}/`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching video data:", error);
      throw error;
    }
  };

  // SWR hook for video data with 10-minute cache
  const useVideoData = (videoId: number | null) => {
    const url = videoId
      ? `${process.env.REACT_APP_BACKEND_URL}api/student/videos/${videoId}/`
      : null;
    return useAPISWR<{ otp: string; playback_info: string }>(url);
  };

  const isDirectVideoUrl = (url: string): boolean => {
    return (
      url.includes(".mp4") ||
      url.includes(".webm") ||
      url.includes(".ogg") ||
      url.includes(".mov")
    );
  };

  // Helper function to get dynamic label for content type
  const getContentLabel = (
    contentType: "lesson" | "notes" | "mcq" | "coding",
    count: number,
    index: number = 0
  ) => {
    if (contentType === "lesson") {
      return count === 1 ? "Video" : `Video ${index + 1}`;
    } else if (contentType === "notes") {
      return count === 1 ? "Notes" : `Notes ${index + 1}`;
    } else if (contentType === "mcq") {
      return "Practice MCQs";
    } else if (contentType === "coding") {
      return "Practice Coding";
    }
    return "";
  };

  // Helper function to determine initial content type based on availability
  const getInitialContentType = (
    subTopic: SubTopic
  ): "lesson" | "notes" | "mcq" | "coding" => {
    if (subTopic.lesson && subTopic.lesson.length > 0) {
      return "lesson";
    } else if (subTopic.notes && subTopic.notes.length > 0) {
      return "notes";
    } else if (subTopic.mcqQuestions > 0) {
      return "mcq";
    } else if (subTopic.codingQuestions > 0) {
      return "coding";
    }
    return "lesson"; // fallback
  };

  // Helper function to get current subtopic name
  const getCurrentSubTopicName = (): string => {
    if (
      chapters.length === 0 ||
      currentSubTopicIndex >= chapters[0].sub_topic_data.length
    ) {
      return "";
    }
    return chapters[0].sub_topic_data[currentSubTopicIndex].sub_topic;
  };

  // VdoCipher time tracking functions
  const initializeVdoCipherTimeTracking = useCallback((iframe: HTMLIFrameElement) => {
    if (!iframe || !(window as any).VdoPlayer) {
      return null;
    }

    try {
      const player = new (window as any).VdoPlayer(iframe);
      
      // Store player instance on iframe for global access (fullscreen control)
      (iframe as any).vdocipherPlayer = player;
      
      // Start time tracking
      setVideoTimeTracking(prev => ({ ...prev, isTracking: true }));
      
      // Set up interval to track time every second
      const timeTrackingInterval = setInterval(() => {
        if (player.api) {
          player.api.getTotalPlayed().then((tp: number) => {
            setVideoTimeTracking(prev => ({ ...prev, totalPlayed: tp }));
          }).catch((error: any) => {
            console.error('VdoCipher: Error getting total played time:', error);
          });
          
          player.api.getTotalCovered().then((tc: number) => {
            setVideoTimeTracking(prev => ({ ...prev, totalCovered: tc }));
          }).catch((error: any) => {
            console.error('VdoCipher: Error getting total covered time:', error);
          });
        }
      }, 1000);
      
      // Return cleanup function
      return () => {
        clearInterval(timeTrackingInterval);
        setVideoTimeTracking(prev => ({ ...prev, isTracking: false }));
        // Clean up player reference
        delete (iframe as any).vdocipherPlayer;
      };
    } catch (error) {
      console.error('VdoCipher: Error initializing player:', error);
      return null;
    }
  }, []);

  // Manual trigger for testing time tracking (can be called from console)
  const manualTriggerTimeTracking = useCallback(() => {
    const iframe = document.querySelector(`iframe[src*="player.vdocipher.com"]`);
    if (iframe) {
      const cleanup = initializeVdoCipherTimeTracking(iframe as HTMLIFrameElement);
      if (cleanup) {
        // Store cleanup function for later use
        (window as any).cleanupVdoCipherTracking = cleanup;
      }
    }
  }, [initializeVdoCipherTimeTracking]);

  // Expose function globally for testing
  useEffect(() => {
    (window as any).manualTriggerTimeTracking = manualTriggerTimeTracking;
    (window as any).getVideoTimeTracking = () => videoTimeTracking;
    
    // Expose fullscreen exit function globally for App.tsx to call
    (window as any).exitVideoFullscreen = () => {
      // Find all VdoCipher iframes and exit fullscreen if any are in fullscreen mode
      const iframes = document.querySelectorAll('iframe[src*="player.vdocipher.com"]');
      let fullscreenExited = false;
      
      iframes.forEach((iframe) => {
        try {
          if ((iframe as any).vdocipherPlayer && (iframe as any).vdocipherPlayer.api) {
            const player = (iframe as any).vdocipherPlayer;
            
            // Check if player API is ready
            if (player.api && typeof player.api.isFullscreen === 'function') {
              player.api.isFullscreen().then((isFullscreen: boolean) => {
                if (isFullscreen) {
                  player.api.exitFullscreen();
                  fullscreenExited = true;
                }
              }).catch((error: any) => {
                // Silently handle errors - fullscreen might not be supported
              });
            }
          }
        } catch (error) {
          // Silently handle errors
        }
      });
      
      // Also try to exit browser fullscreen as a fallback
      if (document.fullscreenElement || (document as any).webkitFullscreenElement || 
          (document as any).mozFullScreenElement || (document as any).msFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
        fullscreenExited = true;
      }
      
      return fullscreenExited;
    };
    
    return () => {
      delete (window as any).manualTriggerTimeTracking;
      delete (window as any).getVideoTimeTracking;
      delete (window as any).exitVideoFullscreen;
    };
  }, [manualTriggerTimeTracking, videoTimeTracking]);

  // Helper function to get content type icon
  const getContentTypeIcon = (
    contentType: "lesson" | "notes" | "mcq" | "coding"
  ): React.ReactElement => {
    switch (contentType) {
      case "lesson":
        return <PiMonitorPlayBold size={20} />;
      case "notes":
        return <SlNotebook size={20} />;
      case "mcq":
        return <BsListTask size={20} />;
      case "coding":
        return <LiaLaptopCodeSolid size={20} />;
      default:
        return <PiMonitorPlayBold size={20} />;
    }
  };
  const handleToggle = () => {
    setIsActive((prevIsActive) => !prevIsActive);
  };
  useEffect(() => {
    const currentId = sessionStorage.getItem("currentSubTopicId");
    if (currentId && chapters.length > 0) {
      const idx = chapters[0].sub_topic_data.findIndex(
        (sub) => sub.subtopicid === currentId
      );
      if (idx !== -1) {
        setExpandedSection(idx.toString());
      }
    }
  }, []);

  // Load VdoCipher API script
  useEffect(() => {
    if (!document.querySelector('script[src*="api.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://player.vdocipher.com/v2/api.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      const blockedKeys = ["v", "c", "a"];

      if (key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      if ((e.ctrlKey || e.metaKey) && blockedKeys.includes(key.toLowerCase())) {
        e.preventDefault();
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        ["i", "j", "c"].includes(key.toLowerCase())
      ) {
        e.preventDefault();
      }
    };

    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", disableRightClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", disableRightClick);
    };
  }, []);

  useEffect(() => {
    const currentId = sessionStorage.getItem("currentSubTopicId");
    if (currentId && chapters.length > 0) {
      const idx = chapters[0].sub_topic_data.findIndex(
        (sub) => sub.subtopicid === currentId
      );
      if (idx !== -1) {
        setExpandedSection(idx.toString());
      }
    }
  }, [
    sessionStorage.getItem("currentSubTopicId"),
    sessionStorage.getItem("lastContentType"),
  ]);

  const url = (subject: string): string => {
    if (subject.toLowerCase().includes("python")) {
      return "/py-editor";
    } else if (subject.toLowerCase().includes("sql")) {
      return "/sql-editor";
    } else if (
      subject.toLowerCase().includes("html") ||
      subject.toLowerCase().includes("css")
    ) {
      return "/html-css-editor";
    } else if (
      subject.toLowerCase().includes("java_script") ||
      subject.toLowerCase().includes("javascript")
    ) {
      return "/js-editor";
    }
    return "/html-css-editor";
  };

  const navigateTo = url(subject);

  useEffect(() => {
    const fetchRoadmapData = async () => {
      const url = `${process.env.REACT_APP_BACKEND_URL}api/student/learningmodules/${studentId}/${subject}/${subjectId}/${dayNumber}/${weekNumber}/`;

      try {
        setLoading(true);
        setDisablePreviousBtn(true);

        const response = await getApiClient().get(url);
        const responseData = response.data.modules;
        // const responseData = backend_response.modules;

        setChapters(responseData);
        const variable = responseData[0].day_completed;

        const allSubtopicIds = responseData.flatMap((chapter: Chapter) =>
          chapter.sub_topic_data.map(
            (subtopic: SubTopic) => subtopic.subtopicid
          )
        );

        if (responseData.length > 0) {
          const chapter = responseData[0];
          const userSubtopicId = chapter.user_subtopic_id;

          const currentSubTopicIdFromSession =
            sessionStorage.getItem("currentSubTopicId");

          const isCurrentSubTopicIdValid =
            currentSubTopicIdFromSession &&
            chapter.sub_topic_data.some(
              (subtopic: SubTopic) =>
                subtopic.subtopicid === currentSubTopicIdFromSession
            );

          if (!isCurrentSubTopicIdValid) {
            sessionStorage.setItem(
              "currentSubTopicId",
              variable
                ? responseData[0].sub_topic_data[0].subtopicid
                : userSubtopicId
            );
          }

          const newUnlockedSubtopics = new Set<string>();

          // If day is completed, unlock all subtopics
          if (chapter.day_completed) {
            chapter.sub_topic_data.forEach((subtopic: SubTopic) => {
              newUnlockedSubtopics.add(subtopic.subtopicid);
            });
          } else {
            // Otherwise, unlock subtopics based on user progress
            // Find the current subtopic index and unlock all up to that point
            const currentSubtopicIndex = chapter.sub_topic_data.findIndex(
              (subtopic: SubTopic) => subtopic.subtopicid === userSubtopicId
            );
            if (currentSubtopicIndex !== -1) {
              // Unlock all subtopics up to and including the current one
              for (let i = 0; i <= currentSubtopicIndex; i++) {
                newUnlockedSubtopics.add(chapter.sub_topic_data[i].subtopicid);
              }
            }
          }

          setUnlockedSubtopics(newUnlockedSubtopics);
          sessionStorage.setItem(
            "unlockedSubtopics",
            JSON.stringify(Array.from(newUnlockedSubtopics))
          );
        }

        if (responseData.length > 0) {
          let unlockSubTopicId = JSON.parse(
            sessionStorage.getItem("unlockedSubtopics") || "[]"
          );
          let currentSubTopicId = sessionStorage.getItem("currentSubTopicId");

          if (currentSubTopicId && unlockSubTopicId.length) {
            let index = unlockSubTopicId.indexOf(currentSubTopicId);
            sessionStorage.setItem("lastSubTopicIndex", index.toString());
          }

          const firstChapter = responseData[0];
          if (
            firstChapter.sub_topic_data &&
            firstChapter.sub_topic_data.length > 0
          ) {
            // Get the correct subtopic based on currentSubTopicId from sessionStorage
            const currentSubTopicId =
              sessionStorage.getItem("currentSubTopicId");
            const subTopicIndex = firstChapter.sub_topic_data.findIndex(
              (sub: { subtopicid: string | null }) =>
                sub.subtopicid === currentSubTopicId
            );
            const actualSubTopicIndex =
              subTopicIndex !== -1 ? subTopicIndex : 0;

            // Set the expanded section to the actual current subtopic index
            setExpandedSection(actualSubTopicIndex.toString());
            setCurrentSubTopicIndex(actualSubTopicIndex);

            // Update session storage with the correct index
            sessionStorage.setItem(
              "lastSubTopicIndex",
              actualSubTopicIndex.toString()
            );

            const subTopic = firstChapter.sub_topic_data[actualSubTopicIndex];

            // Determine initial content type based on availability
            const initialContentType = getInitialContentType(subTopic);

            // Check stored content type and respect it if available in current subtopic
            const storedContentType = sessionStorage.getItem("lastContentType");

            // Check if the stored content type is available for this subtopic
            const isValidStoredType =
              storedContentType &&
              ((storedContentType === "lesson" &&
                subTopic.lesson &&
                subTopic.lesson.length > 0) ||
                (storedContentType === "notes" &&
                  subTopic.notes &&
                  subTopic.notes.length > 0) ||
                (storedContentType === "mcq" && subTopic.mcqQuestions > 0) ||
                (storedContentType === "coding" &&
                  subTopic.codingQuestions > 0));

            if (isValidStoredType) {
              setCurrentView(
                storedContentType as "lesson" | "mcq" | "coding" | "notes"
              );
              sessionStorage.setItem("lastContentType", storedContentType);
            } else {
              // Clear the invalid stored content type
              sessionStorage.removeItem("lastContentType");
              setCurrentView(initialContentType);
              sessionStorage.setItem("lastContentType", initialContentType);
            }

            // Set initial content based on the actual current view
            const actualCurrentView =
              sessionStorage.getItem("lastContentType") || initialContentType;

            if (
              actualCurrentView === "lesson" &&
              subTopic.lesson &&
              subTopic.lesson.length > 0
            ) {
              const firstVideoId = subTopic.lesson[0];
              setSelectedContent(`Video ${firstVideoId}`);
            } else if (
              actualCurrentView === "notes" &&
              subTopic.notes &&
              subTopic.notes.length > 0
            ) {
              // Use SWR hook for notes content with 10-minute cache
              const noteId = subTopic.notes[0];
              setCurrentNoteId(noteId);
              setContentType("notes");
            } else if (
              actualCurrentView === "mcq" &&
              subTopic.mcqQuestions > 0
            ) {
              // Fetch MCQ questions for initial load
              fetchMCQQuestions(actualSubTopicIndex);
              setHasFetched(true);
            } else if (
              actualCurrentView === "coding" &&
              subTopic.codingQuestions > 0
            ) {
              // Fetch coding questions for initial load
              fetchCodingQuestions(actualSubTopicIndex);
              setHasFetched(true);
            }
          }
        }

        const statusResponse = await updateLessonStatus(false);

        // Check for incomplete subtopics in the response
        if (statusResponse && statusResponse.incomplete_sub_topics) {
          setIncompleteSubtopics(statusResponse.incomplete_sub_topics);
        } else {
          setIncompleteSubtopics([]);
        }

        setLoading(false);
        setDisablePreviousBtn(false);
      } catch (innerError: any) {
        setError("Failed to load learning modules. Please try again later.");
        setLoading(false);
        setDisablePreviousBtn(false);

        console.error("Error fetching roadmap data:", innerError);
      }
    };

    fetchRoadmapData();
  }, [studentId, subject, dayNumber]);

  const fetchMCQQuestions = useCallback(
    async (subTopicIndex: number) => {
      const url = `${
        process.env.REACT_APP_BACKEND_URL
      }api/student/practicemcq/${studentId}/${subject}/${subjectId}/${dayNumber}/${weekNumber}/${sessionStorage.getItem(
        "currentSubTopicId"
      )}/`;
      try {
        setLoading(true);
        setDisablePreviousBtn(true);
        const response = await getApiClient().get(url);

        setMcqQuestions(response.data.questions);
        setCurrentMCQIndex(0);
        setLoading(false);
        setDisablePreviousBtn(false);
      } catch (innerError: any) {
        setError("Failed to load MCQ questions. Please try again later.");
        setLoading(false);

        console.error("Error fetching MCQ questions data:", innerError);
      }
    },
    [studentId, subject, dayNumber]
  );

  const fetchCodingQuestions = useCallback(
    async (subTopicIndex: number) => {
      const url = `${
        process.env.REACT_APP_BACKEND_URL
      }api/student/practicecoding/${studentId}/${subject}/${subjectId}/${dayNumber}/${weekNumber}/${sessionStorage.getItem(
        "currentSubTopicId"
      )}/`;
      try {
        setLoading(true);
        setDisablePreviousBtn(true);
        const response = await getApiClient().get(url);
        const codingQuestionsData = response.data.questions.map(
          (question: any, index: number) => ({
            id: index + 1,
            question: question.Qn,
            score: question.score,
            isSolved: question.status,
          })
        );
        setCodingQuestions(codingQuestionsData);
        setLoading(false);
        setDisablePreviousBtn(false);
      } catch (innerError: any) {
        setError("Failed to load coding questions. Please try again later.");
        setLoading(false);
        setDisablePreviousBtn(false);

        console.error("Error fetching coding questions data:", innerError);
      }
    },
    [studentId, subject, dayNumber]
  );

  // SWR hook for caching notes with 10-minute TTL
  const useNotesContent = (noteId: number | null) => {
    const url = noteId
      ? `${process.env.REACT_APP_BACKEND_URL}api/student/notes/${noteId}/`
      : null;
    return useAPISWR<{ content: string }>(url);
  };

  // Use SWR for notes content
  const { data: notesContent, error: notesError } =
    useNotesContent(currentNoteId);

  // Use SWR for video data
  const { data: videoDataFromSWR, error: videoErrorFromSWR } =
    useVideoData(currentVideoId);

  // Handle notes content from SWR
  useEffect(() => {
    if (notesContent && currentNoteId) {
      setSelectedContent(notesContent.content);
      setNotesData((prev) => ({
        ...prev,
        [currentNoteId]: {
          id: currentNoteId,
          content: notesContent.content,
        },
      }));
    }
  }, [notesContent, currentNoteId]);

  // Handle video data from SWR
  useEffect(() => {
    if (videoDataFromSWR && currentVideoId) {
      setVideoData((prev) => ({
        ...prev,
        [currentVideoId]: videoDataFromSWR,
      }));
    }
  }, [videoDataFromSWR, currentVideoId]);

  // Set current video ID when lesson changes
  useEffect(() => {
    if (chapters.length > 0 && currentView === "lesson") {
      const currentSubTopic = chapters[0].sub_topic_data[currentSubTopicIndex];
      if (currentSubTopic.lesson && currentSubTopic.lesson.length > 0) {
        const currentLesson = currentSubTopic.lesson[currentLessonIndex];
        if (typeof currentLesson === "number") {
          setCurrentVideoId(currentLesson);
        }
      }
    }
  }, [chapters, currentView, currentSubTopicIndex, currentLessonIndex]);

  const toggleSection = useCallback((index: number) => {
    setExpandedSections((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }, []);

  const handleSubTopicChange = useCallback(
    async (index: number, isUserInitiated: boolean = false) => {
      setCurrentSubTopicIndex(index);
      setCurrentLessonIndex(0);
      setCurrentNotesIndex(0);
      setCurrentMCQIndex(0);

      // Clear MCQ and coding questions when subtopic changes
      setMcqQuestions([]);
      setCodingQuestions([]);
      setHasFetched(false);

      // Clear the last content type when subtopic changes
      sessionStorage.removeItem("lastContentType");

      sessionStorage.setItem("lastSubTopicIndex", index.toString());

      if (!expandedSections.includes(index)) {
        setExpandedSections((prev) => [...prev, index]);
      }

      if (chapters.length > 0 && chapters[0].sub_topic_data.length > index) {
        const subTopic = chapters[0].sub_topic_data[index];

        if (!isUserInitiated) {
          setDisablePreviousBtn(true);
          try {
            await updateLessonStatus(false);
          } catch (innerError: any) {
            console.error(
              "Error fetching handle subtopic change data:",
              innerError
            );
          } finally {
            setDisablePreviousBtn(false);
          }
        }

        // Priority: Always show videos if available, regardless of stored content type
        if (subTopic.lesson && subTopic.lesson.length > 0) {
          setCurrentView("lesson");
          sessionStorage.setItem("lastContentType", "lesson");
          // No need to set selectedContent for videos - they will be built dynamically
        } else if (subTopic.notes && subTopic.notes.length > 0) {
          setCurrentView("notes");
          sessionStorage.setItem("lastContentType", "notes");
          // Use SWR for notes content with 10-minute cache
          const noteId = subTopic.notes[0];
          setCurrentNoteId(noteId);
          setContentType("notes");
        } else if (subTopic.mcqQuestions > 0) {
          setCurrentView("mcq");
          sessionStorage.setItem("lastContentType", "mcq");
          // Fetch MCQ questions for the new subtopic
          await fetchMCQQuestions(index);
          setHasFetched(true);
        } else if (subTopic.codingQuestions > 0) {
          setCurrentView("coding");
          sessionStorage.setItem("lastContentType", "coding");
          // Fetch coding questions for the new subtopic
          await fetchCodingQuestions(index);
          setHasFetched(true);
        }
      }

      setDisablePreviousBtn(false);
    },
    [chapters, expandedSections, fetchMCQQuestions, fetchCodingQuestions]
  );

  const handleViewChange = useCallback(
    async (view: "lesson" | "mcq" | "coding" | "notes") => {
      setCurrentView(view);
      sessionStorage.setItem("lastContentType", view);
      setCurrentContentType(view);

      if (!expandedSections.includes(currentSubTopicIndex)) {
        setExpandedSections((prev) => [...prev, currentSubTopicIndex]);
      }

      if (
        chapters.length > 0 &&
        chapters[0].sub_topic_data.length > currentSubTopicIndex
      ) {
        const subTopic = chapters[0].sub_topic_data[currentSubTopicIndex];

        if (
          view === "lesson" &&
          subTopic.lesson &&
          subTopic.lesson.length > 0
        ) {
          // No need to set selectedContent for videos - they will be built dynamically
        } else if (
          view === "notes" &&
          subTopic.notes &&
          subTopic.notes.length > 0
        ) {
          // Use SWR for notes content with 10-minute cache
          const noteId = subTopic.notes[currentNotesIndex];
          setCurrentNoteId(noteId);
          setContentType("notes");
        } else if (view === "mcq") {
          // Always fetch MCQ questions when switching to MCQ view
          if (!hasFetched || mcqQuestions.length === 0) {
            fetchMCQQuestions(currentSubTopicIndex);
          }
        } else if (view === "coding") {
          // Always fetch coding questions when switching to coding view
          if (!hasFetched || codingQuestions.length === 0) {
            fetchCodingQuestions(currentSubTopicIndex);
          }
        }
      }
    },
    [
      chapters,
      currentSubTopicIndex,
      currentLessonIndex,
      currentNotesIndex,
      fetchMCQQuestions,
      fetchCodingQuestions,
      expandedSections,
      hasFetched,
      mcqQuestions.length,
      codingQuestions.length,
    ]
  );

  const handleNextLesson = useCallback(() => {
    if (
      chapters.length > 0 &&
      chapters[0].sub_topic_data.length > currentSubTopicIndex
    ) {
      const subTopic = chapters[0].sub_topic_data[currentSubTopicIndex];
      // Check if there are more videos in the lesson array or more subtopics
      if (subTopic.lesson && currentLessonIndex < subTopic.lesson.length - 1) {
        const nextIndex = currentLessonIndex + 1;
        setCurrentLessonIndex(nextIndex);
      } else if (chapters[0].sub_topic_data.length > currentSubTopicIndex + 1) {
        const nextSubTopicIndex = currentSubTopicIndex + 1;
        setCurrentSubTopicIndex(nextSubTopicIndex);
        setCurrentLessonIndex(0);

        // Clear the last content type when moving to next subtopic
        sessionStorage.removeItem("lastContentType");

        if (currentView === "mcq") {
          fetchMCQQuestions(nextSubTopicIndex);
        } else if (currentView === "coding") {
          fetchCodingQuestions(nextSubTopicIndex);
        }
      }
    }
  }, [
    chapters,
    currentSubTopicIndex,
    currentLessonIndex,
    currentView,
    fetchMCQQuestions,
    fetchCodingQuestions,
  ]);

  const handlePreviousLesson = useCallback(() => {
    if (currentLessonIndex > 0) {
      const prevIndex = currentLessonIndex - 1;
      setCurrentLessonIndex(prevIndex);
    } else if (currentSubTopicIndex > 0) {
      const prevSubTopicIndex = currentSubTopicIndex - 1;
      const prevSubTopic = chapters[0].sub_topic_data[prevSubTopicIndex];
      setCurrentSubTopicIndex(prevSubTopicIndex);
      setCurrentLessonIndex(
        prevSubTopic.lesson ? prevSubTopic.lesson.length - 1 : 0
      );

      // Clear the last content type when moving to previous subtopic
      sessionStorage.removeItem("lastContentType");

      if (currentView === "mcq") {
        fetchMCQQuestions(prevSubTopicIndex);
      } else if (currentView === "coding") {
        fetchCodingQuestions(prevSubTopicIndex);
      }
    }
  }, [
    chapters,
    currentSubTopicIndex,
    currentLessonIndex,
    currentView,
    fetchMCQQuestions,
    fetchCodingQuestions,
  ]);

  const handleNextNotes = useCallback(async () => {
    if (
      chapters.length > 0 &&
      chapters[0].sub_topic_data.length > currentSubTopicIndex
    ) {
      const subTopic = chapters[0].sub_topic_data[currentSubTopicIndex];
      if (subTopic.notes && currentNotesIndex < subTopic.notes.length - 1) {
        const nextIndex = currentNotesIndex + 1;
        setCurrentNotesIndex(nextIndex);
        const noteId = subTopic.notes[nextIndex];
        setCurrentNoteId(noteId);
      } else if (chapters[0].sub_topic_data.length > currentSubTopicIndex + 1) {
        const nextSubTopicIndex = currentSubTopicIndex + 1;
        setCurrentSubTopicIndex(nextSubTopicIndex);
        setCurrentNotesIndex(0);

        // Clear the last content type when moving to next subtopic
        sessionStorage.removeItem("lastContentType");

        const nextSubTopic = chapters[0].sub_topic_data[nextSubTopicIndex];
        if (nextSubTopic.notes && nextSubTopic.notes.length > 0) {
          const noteId = nextSubTopic.notes[0];
          setCurrentNoteId(noteId);
        }
      }
    }
  }, [chapters, currentSubTopicIndex, currentNotesIndex]);

  const handlePreviousNotes = useCallback(async () => {
    if (currentNotesIndex > 0) {
      const prevIndex = currentNotesIndex - 1;
      setCurrentNotesIndex(prevIndex);
      const noteId =
        chapters[0].sub_topic_data[currentSubTopicIndex].notes[prevIndex];
      setCurrentNoteId(noteId);
    } else if (currentSubTopicIndex > 0) {
      const prevSubTopicIndex = currentSubTopicIndex - 1;
      const prevSubTopic = chapters[0].sub_topic_data[prevSubTopicIndex];

      if (prevSubTopic.notes && prevSubTopic.notes.length > 0) {
        setCurrentSubTopicIndex(prevSubTopicIndex);
        setCurrentNotesIndex(prevSubTopic.notes.length - 1);
        const noteId = prevSubTopic.notes[prevSubTopic.notes.length - 1];
        setCurrentNoteId(noteId);

        // Clear the last content type when moving to previous subtopic
        sessionStorage.removeItem("lastContentType");
      }
    }
  }, [chapters, currentSubTopicIndex, currentNotesIndex]);

  const handleNextMCQ = useCallback(() => {
    const currentSubtopic = chapters[0]?.sub_topic_data[currentSubTopicIndex];
    const totalMCQQuestions = currentSubtopic
      ? currentSubtopic.mcqQuestions
      : 0;

    if (currentMCQIndex < totalMCQQuestions - 1) {
      setCurrentMCQIndex(currentMCQIndex + 1);
      // Don't reset MCQ interaction - once user has interacted, they can navigate between MCQs
    } else {
      if (
        chapters.length > 0 &&
        chapters[0].sub_topic_data.length > currentSubTopicIndex + 1
      ) {
        const nextSubTopicIndex = currentSubTopicIndex + 1;
        setCurrentSubTopicIndex(nextSubTopicIndex);

        // Clear the last content type when moving to next subtopic
        sessionStorage.removeItem("lastContentType");

        fetchMCQQuestions(nextSubTopicIndex);
      }
    }
  }, [
    currentMCQIndex,
    mcqQuestions,
    chapters,
    currentSubTopicIndex,
    fetchMCQQuestions,
  ]);

  const handlePreviousMCQ = useCallback(() => {
    if (currentMCQIndex > 0) {
      setCurrentMCQIndex(currentMCQIndex - 1);
    } else {
      if (currentSubTopicIndex > 0) {
        const prevSubTopicIndex = currentSubTopicIndex - 1;
        setCurrentSubTopicIndex(prevSubTopicIndex);

        // Clear the last content type when moving to previous subtopic
        sessionStorage.removeItem("lastContentType");

        fetchMCQQuestions(prevSubTopicIndex);
      }
    }
  }, [
    currentMCQIndex,
    mcqQuestions,
    currentSubTopicIndex,
    chapters,
    fetchMCQQuestions,
  ]);

  const isNextButtonDisabled = useCallback(() => {
    if (!chapters.length) return true;

    if (currentView === "lesson") {
      const subTopic = chapters[0].sub_topic_data[currentSubTopicIndex];
      const hasMoreLessons =
        subTopic.lesson && currentLessonIndex < subTopic.lesson.length - 1;
      const hasNotes = subTopic.notes && subTopic.notes.length > 0;
      const hasCodingQuestions = subTopic.codingQuestions > 0;
      const hasMCQs = subTopic.mcqQuestions > 0;
      return !hasMoreLessons && !hasNotes && !hasCodingQuestions && !hasMCQs;
    } else if (currentView === "notes") {
      const hasMoreNotes =
        currentNotesIndex <
        chapters[0].sub_topic_data[currentSubTopicIndex].notes.length - 1;
      const hasCodingQuestions =
        chapters[0].sub_topic_data[currentSubTopicIndex].codingQuestions > 0;
      const hasMCQs =
        chapters[0].sub_topic_data[currentSubTopicIndex].mcqQuestions > 0;
      return !hasMoreNotes && !hasCodingQuestions && !hasMCQs;
    } else if (currentView === "mcq") {
      const hasMoreMCQs = currentMCQIndex < mcqQuestions.length - 1;
      const hasCodingQuestions =
        chapters[0].sub_topic_data[currentSubTopicIndex].codingQuestions > 0;
      const currentSubtopicId = sessionStorage.getItem("currentSubTopicId");
      const hasInteracted = currentSubtopicId
        ? mcqInteracted[currentSubtopicId]
        : false;

      // Disable Next button if user hasn't interacted with MCQ yet
      if (!hasInteracted) {
        return true;
      }

      // If there are more MCQs, always allow Next button (user has already interacted)
      if (hasMoreMCQs) {
        return false;
      }

      return !hasCodingQuestions;
    } else if (currentView === "coding") {
      return currentSubTopicIndex >= chapters[0].sub_topic_data.length - 1;
    }

    return true;
  }, [
    chapters,
    currentView,
    currentSubTopicIndex,
    currentLessonIndex,
    currentNotesIndex,
    currentMCQIndex,
    mcqQuestions,
  ]);

  const isPreviousButtonDisabled = useCallback(() => {
    if (!chapters.length) return true;

    if (currentView === "lesson") {
      return currentLessonIndex === 0 && currentSubTopicIndex === 0;
    } else if (currentView === "coding") {
      return false;
    }

    return false;
  }, [
    chapters,
    currentView,
    currentSubTopicIndex,
    currentLessonIndex,
    currentNotesIndex,
    currentMCQIndex,
  ]);

  const handleAnswerSelect = useCallback(
    (questionId: string, option: string) => {
      setSelectedAnswers((prev) => ({
        ...prev,
        [questionId]: option,
      }));

      // Track MCQ interaction for the current subtopic
      const currentSubtopicId = sessionStorage.getItem("currentSubTopicId");
      if (currentSubtopicId) {
        setMcqInteracted((prev) => ({
          ...prev,
          [currentSubtopicId]: true,
        }));
      }
    },
    []
  );

  const handleSubmitAnswer = useCallback(
    async (questionId: string, correctAnswer: string) => {
      const isCorrect = selectedAnswers[questionId] === correctAnswer;

      setSubmittedAnswers((prev) => ({
        ...prev,
        [questionId]: isCorrect,
      }));

      if (!isCorrect) {
        // Show explanation functionality removed
      }

      setAnsweredQuestions((prev) => {
        const newSet = new Set(prev);
        newSet.add(questionId);
        return newSet;
      });

      const currentQuestion = mcqQuestions.find(
        (q) => q.Qn_name === questionId
      );

      if (currentQuestion) {
        const submissionData = {
          student_id: studentId,
          question_id: questionId,
          correct_ans: correctAnswer,
          entered_ans: selectedAnswers[questionId],
          subject_id: subjectId,
          subject: subject.split(" ")[0],
          week_number: parseInt(weekNumber),
          day_number: parseInt(dayNumber),
          course_id: decryptedCourseId,
          batch_id: decryptedBatchId,
        };

        setDisablePreviousBtn(true);
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/practicemcq/submit/`;
        try {
          const response = await getApiClient().post(url, submissionData);

          setMcqQuestions((prevQuestions) =>
            prevQuestions.map((question) =>
              question.Qn_name === questionId
                ? { ...question, score: response.data.score }
                : question
            )
          );
          // Trigger MCQ status API in loop after successful submission
          await triggerMCQStatusAPI(submissionData);
        } catch (innerError: any) {
          console.error("Error fetching submitting answer data:", innerError);
        } finally {
          setDisablePreviousBtn(false);
        }
      }
    },
    [
      selectedAnswers,
      mcqQuestions,
      studentId,
      subject,
      subjectId,
      weekNumber,
      dayNumber,
    ]
  );

  // New function to trigger MCQ status API in loop
  const triggerMCQStatusAPI = async (submissionData: any) => {
    const statusUrl = `${process.env.REACT_APP_BACKEND_URL}api/student/practice/mcq/status/`;
    let maxAttempts = 3;
    let attempt = 0;
  
    while (attempt < maxAttempts) {
      try {
        const response = await getApiClient().put(statusUrl, submissionData);
        // Check for different response formats
        if (response.data?.message === true) {
          break; // Stop immediately when we get true
        } else {
          attempt++;
          
          // Add a small delay between attempts to avoid overwhelming the server
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
      } catch (error: any) {
        attempt++;
        
        // Add delay before retry on error
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  };

  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfError, setPdfError] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => {
    const fetchMedia = async () => {
      const notesUrl =
        chapters[0]?.sub_topic_data[currentSubTopicIndex]?.notes?.[
          currentNotesIndex
        ];
      const lessonVideoUrl =
        chapters[0]?.sub_topic_data[currentSubTopicIndex]?.lesson?.[
          currentLessonIndex
        ] || "";

      if (sessionStorage.getItem("lastContentType") === "notes") {
        // No need to fetch notes since they now contain HTML content directly
      } else {
        // Only fetch video if we're not using hardcoded VideoEmbed URLs
        // Since the current implementation uses hardcoded VideoEmbed, we skip video fetching
        // await fetchVideo(lessonVideoUrl);
      }
    };

    const fetchNotes = async (notesUrl: string) => {
      if (notesUrl && notesUrl.endsWith(".pdf")) {
        setPdfLoading(true);
        setPdfError(false);
        setLoading(true);
        const url = `${process.env.REACT_APP_BACKEND_URL}api/media/`;
        try {
          const response = await getApiClient().post(
            url,
            { file_url: notesUrl },
            {
              responseType: "blob",
            }
          );

          const processedUrl = URL.createObjectURL(response.data);
          setPdfUrl(processedUrl);
        } catch (innerError: any) {
          setPdfError(true);
          console.error("Error fetching pdf data:", innerError);
        } finally {
          setPdfLoading(false);
          setLoading(false);
        }
      }
    };

    const fetchVideo = async (lessonVideoUrl: string) => {
      if (lessonVideoUrl && lessonVideoUrl.endsWith(".mp4")) {
        setVideoLoading(true);
        setVideoError(false);
        setLoading(true);
        setVideoUrl("");

        try {
          const response = await getApiClient().post(
            `${process.env.REACT_APP_BACKEND_URL}api/media/`,
            { file_url: lessonVideoUrl },
            {
              responseType: "blob",
            }
          );

          const processedUrl = URL.createObjectURL(response.data);
          setVideoUrl(processedUrl);
        } catch (innerError: any) {
          setVideoError(true);
          console.error("Error fetching video:", innerError);
        } finally {
          setVideoLoading(false);
          setLoading(false);
        }
      }
    };

    let lastContent = sessionStorage.getItem("lastContentType");
    // Only fetch media for notes, not for lessons since we use hardcoded VideoEmbed URLs
    if (lastContent === "notes") {
      fetchMedia();
    }
  }, [
    chapters,
    currentSubTopicIndex,
    currentNotesIndex,
    currentLessonIndex,
    sessionStorage.getItem("lastContentType"),
  ]);

  const renderLessonContent = () => {
    if (loading) {
      return (
        <div className="d-flex justify-content-center">
          <div style={{ height: "calc(100%)", overflow: "auto" }}>
            <Skeleton />
          </div>
        </div>
      );
    }

    if (
      error ||
      !chapters.length ||
      !chapters[0].sub_topic_data[currentSubTopicIndex]?.lesson?.length
    ) {
      return (
        <div className="d-flex justify-content-center">
          <div style={{ height: "calc(100% - 60px)", overflow: "auto" }}>
            <Skeleton />
          </div>
        </div>
      );
    }

    const currentLesson =
      chapters[0].sub_topic_data[currentSubTopicIndex].lesson[
        currentLessonIndex
      ];

    // Check if lesson is an array of integers (video IDs) or objects (video data)
    if (typeof currentLesson === "number") {
      // Format 1: Array of integers - need to fetch video data
      const currentVideoId = currentLesson;

      // Check if we have cached video data for this video ID
      const hasCachedVideoData = videoData[currentVideoId];

      // If we don't have cached data, show loading
      if (!hasCachedVideoData) {
        // Show loading while fetching
        return (
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ height: "calc(100% - 60px)" }}
          >
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading video...</p>
            </div>
          </div>
        );
      }

      // Build video URL from cached data
      const videoDataForCurrentVideo = videoData[currentVideoId];
      const videoUrl = `https://player.vdocipher.com/v2/?otp=${videoDataForCurrentVideo.otp}&playbackInfo=${videoDataForCurrentVideo.playback_info}`;

      if (!videoUrl) {
        return (
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ height: "calc(100% - 60px)" }}
          >
            <div className="text-center">
              <p>Video not available</p>
            </div>
          </div>
        );
      }

      return (
        <div
          className="h-100 overflow-hidden p-0"
          style={{ backgroundColor: "transparent", height: "100%" }}
        >
          {isDirectVideoUrl(videoUrl) ? (
            <video
              className="w-100 h-100"
              controls
              autoPlay={false}
              muted={false}
              preload="metadata"
              style={{
                boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
                borderRadius: "0px",
                objectFit: "cover",
                backgroundColor: "transparent",
              }}
            >
              <source src={videoUrl} type="video/mp4" />
              <source src={videoUrl} type="video/webm" />
              <source src={videoUrl} type="video/ogg" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <iframe
              ref={(iframe) => {
                if (iframe && videoTimeTracking.isTracking === false) {
                  // Initialize time tracking when iframe loads
                  setTimeout(() => {
                    const cleanup = initializeVdoCipherTimeTracking(iframe);
                    if (cleanup) {
                      // Store cleanup function for this video
                      (window as any).cleanupVdoCipherTracking = cleanup;
                    }
                  }, 2000); // Wait 2 seconds for iframe to fully load
                }
              }}
              className="w-100 h-100"
              src={videoUrl}
              title="Video Player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              style={{
                boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
                borderRadius: "0px",
                backgroundColor: "transparent",
              }}
            />
          )}
        </div>
      );
    } else {
      // Format 2: Object with video data - use directly
      const videoLesson = currentLesson as VideoLesson;
      const videoUrl = `https://player.vdocipher.com/v2/?otp=${videoLesson.otp}&playbackInfo=${videoLesson.playback_info}`;

      if (!videoUrl) {
        return (
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ height: "calc(100% - 60px)" }}
          >
            <div className="text-center">
              <p>Video not available</p>
            </div>
          </div>
        );
      }

      return (
        <div
          className="h-100 overflow-hidden p-0"
          style={{ backgroundColor: "transparent", height: "100%" }}
        >
          {isDirectVideoUrl(videoUrl) ? (
            <video
              className="w-100 h-100"
              controls
              autoPlay={false}
              muted={false}
              preload="metadata"
              style={{
                boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
                borderRadius: "0px",
                objectFit: "cover",
                backgroundColor: "transparent",
              }}
            >
              <source src={videoUrl} type="video/mp4" />
              <source src={videoUrl} type="video/webm" />
              <source src={videoUrl} type="video/ogg" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <iframe
              ref={(iframe) => {
                if (iframe && videoTimeTracking.isTracking === false) {
                  // Initialize time tracking when iframe loads
                  setTimeout(() => {
                    const cleanup = initializeVdoCipherTimeTracking(iframe);
                    if (cleanup) {
                      // Store cleanup function for this video
                      (window as any).cleanupVdoCipherTracking = cleanup;
                    }
                  }, 2000); // Wait 2 seconds for iframe to fully load
                }
              }}
              className="w-100 h-100"
              src={videoUrl}
              title="Video Player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              style={{
                boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
                borderRadius: "0px",
                backgroundColor: "transparent",
              }}
            />
          )}
        </div>
      );
    }
  };

  const renderNotesContent = () => {
    if (
      loading ||
      error ||
      !chapters.length ||
      !chapters[0].sub_topic_data[currentSubTopicIndex]?.notes?.length
    ) {
      return (
        <div>
          {/* <Skeleton count={6} height={20} width={100} />
                    <Skeleton count={6} height={20} /> */}
        </div>
      );
    }

    const subTopic = chapters[0].sub_topic_data[currentSubTopicIndex];
    const noteId = subTopic.notes[currentNotesIndex];
    const noteData = notesData[noteId];

    if (!noteData) {
      return (
        <div className="d-flex justify-content-center align-items-center h-100">
          <Skeleton count={6} height={20} />
        </div>
      );
    }

    // Display HTML content directly in div using dangerouslySetInnerHTML
    return (
      <div
        className="p-0 m-0 ps-3 scrollable-content"
        style={{
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          fontSize: "16px",
          lineHeight: "1.6",
          padding: "20px",
          color: "#333",
          minHeight: "100%",
          overflow: "auto",
        }}
        dangerouslySetInnerHTML={{
          __html: `
                    <style>
                        h1, h2 {
                            font-weight: 600;
                            color: #2C3E50;
                            
                        }
                        ul {
                            margin: 10px 0 20px 20px;
                        }
                        li {
                            margin-bottom: 8px;
                        }
                        code {
                            background-color: #F4F4F4;
                            padding: 4px 6px;
                            font-family: Consolas, monospace;
                            border-radius: 4px;
                        }
                        table {
                            border-collapse: collapse;
                            width: 100%;
                            margin: 20px 0;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 12px;
                            text-align: left;
                        }
                        th {
                            background-color: #F0F0F0;
                        }
                        pre {
                            background-color: #F8F8F8;
                            padding: 12px;
                            border-left: 3px solid #ccc;
                            font-size: 15px;
                            overflow-x: auto;
                        }
                    </style>
                    ${noteData.content}
                `,
        }}
      />
    );
  };

  const renderMCQContent = () => {
    const shuffleArray = (array: string[]) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    if (error || !mcqQuestions.length) {
      return <div></div>;
    }

    const currentQuestion = mcqQuestions[currentMCQIndex];

    if (!currentQuestion) {
      return <div></div>;
    }

    if (!currentQuestion.shuffledOptions) {
      currentQuestion.shuffledOptions = shuffleArray(
        Array.isArray(currentQuestion.options)
          ? [...currentQuestion.options]
          : []
      );
    }

    const shuffledOptions = currentQuestion.shuffledOptions;
    const score = currentQuestion.score;
    const questionId = currentQuestion.Qn_name;
    const isAnswered =
      currentQuestion.entered_ans !== "" || answeredQuestions.has(questionId);
    const isCorrect = submittedAnswers[questionId];

    return (
      <div className="d-flex flex-grow-1" style={{ height: "100%" }}>
        <div
          className="d-flex flex-column align-items-center"
          style={{ width: "80px", overflowY: "auto", maxHeight: "100%" }}
        >
          {mcqQuestions.map((_, index) => (
            <button
              key={index}
              className="btn border border-muted rounded-2 my-1 px-1 mx-auto"
              style={{
                width: "50px",
                height: "55px",
                backgroundColor: index === currentMCQIndex ? "#42FF58" : "#fff",
                color: index === currentMCQIndex ? "#000" : "#000",
                cursor: "pointer",
              }}
              onClick={() => setCurrentMCQIndex(index)}
            >
              <span>Q{index + 1}</span>
            </button>
          ))}
        </div>

        <div
          className="flex-grow-1 d-flex flex-column"
          style={{ height: "100%", width: "min-content" }}
        >
          <div
            className="border border-muted "
            style={{
              height: "100%",
              overflow: "auto",
              boxShadow: "#00000033 0px 0px 5px 0px inset",
              maxHeight: "100%",
            }}
          >
            <div className="p-3">
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-3">
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      width: "70%",
                      fontFamily:
                        "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                      fontSize: "16px",
                      lineHeight: "1.6",
                      color: "#333",
                    }}
                  >
                    {currentQuestion.question}
                  </div>
                  <div
                    style={{
                      fontFamily:
                        "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#333",
                      display: "inline-block",
                      whiteSpace: "nowrap",
                      minWidth: "120px",
                      textAlign: "right",
                    }}
                  >
                    Score : {score}
                  </div>
                </div>

                <div className="row g-2">
                  {shuffledOptions.map(
                    (
                      option:
                        | string
                        | number
                        | boolean
                        | React.ReactElement<
                            any,
                            string | React.JSXElementConstructor<any>
                          >
                        | Iterable<React.ReactNode>
                        | null
                        | undefined,
                      index: React.Key | null | undefined
                    ) => {
                      const isSelected = selectedAnswers[questionId] === option;
                      const isCorrectOption =
                        option === currentQuestion.correct_answer;
                      const isWrongOption =
                        option === currentQuestion.entered_ans;

                      let bgColor = "";
                      if (!isAnswered) {
                        bgColor = isSelected ? "#E0E0E0" : "";
                      } else {
                        if (isCorrectOption) {
                          bgColor = "#BAFFCE";
                        } else if (isSelected || isWrongOption) {
                          bgColor = "#FFC9C9";
                        }
                      }

                      return (
                        <div
                          key={index}
                          className="col-6 d-flex align-items-center mb-2"
                        >
                          <div
                            className="me-2 mx-3"
                            style={{
                              fontFamily:
                                "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "#333",
                            }}
                          >
                            {String.fromCharCode(65 + (index as number))}.{" "}
                          </div>

                          <button
                            className="btn text-center px-2 py-1 rounded-2 border border-muted"
                            style={{
                              backgroundColor: bgColor,
                              height: "100%",
                              width: "100%",
                              overflowWrap: "break-word",
                              whiteSpace: "normal",
                              boxShadow: "#00000033 0px 5px 4px",
                              fontFamily:
                                "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                              fontSize: "14px",
                              fontWeight: "500",
                              color: "#333",
                            }}
                            onClick={() => {
                              if (!isAnswered) {
                                handleAnswerSelect(
                                  questionId,
                                  option as string
                                );
                              }
                            }}
                            disabled={isAnswered}
                          >
                            {option}
                          </button>
                        </div>
                      );
                    }
                  )}
                </div>

                {isAnswered ? (
                  <button
                    className="btn btn-outline-light mt-3 roadmap-button text-light"
                    disabled={true}
                  >
                    Submitted
                  </button>
                ) : (
                  <button
                    className="btn btn-outline-light mt-3 roadmap-button text-light"
                    onClick={() =>
                      handleSubmitAnswer(
                        questionId,
                        currentQuestion.correct_answer
                      )
                    }
                    disabled={!selectedAnswers[questionId]}
                  >
                    Submit
                  </button>
                )}
                {isAnswered && !isCorrect && currentQuestion.Explanation && (
                  <div
                    className="mt-4 border rounded-2 p-2"
                    style={{
                      backgroundColor: "white",
                      boxShadow: "#00000033 0px 5px 4px",
                      fontFamily:
                        "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                      fontSize: "14px",
                      color: "#333",
                    }}
                  >
                    <strong
                      style={{
                        fontFamily:
                          "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333",
                      }}
                    >
                      Explanation:
                    </strong>
                    <div
                      style={{
                        fontFamily:
                          "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                        fontSize: "14px",
                        lineHeight: "1.5",
                        color: "#333",
                        marginTop: "8px",
                      }}
                    >
                      {currentQuestion.Explanation}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCodingContent = () => {
    if (error || !codingQuestions || !codingQuestions.length) {
      return <div></div>;
    }

    return (
      <div
        className="p-3 CodingInfo"
        style={{ height: "calc(100%)", overflow: "auto" }}
      >
        {codingQuestions.map((question) => (
          <div key={question.id} className="mb-4">
            <div className="d-flex align-items-start justify-content-between">
              <div className="d-flex flex-column">
                <div className="d-flex align-items-start">
                  <span className="me-2">{question.id}.</span>
                  <span style={{ wordBreak: "break-word" }}>
                    {question.question &&
                    question.question.length >
                      (window.innerWidth < 600
                        ? 30
                        : window.innerWidth < 1024
                        ? 50
                        : 80)
                      ? question.question.slice(
                          0,
                          window.innerWidth < 1000
                            ? 30
                            : window.innerWidth < 1200
                            ? 50
                            : window.innerWidth < 1400
                            ? 80
                            : 100
                        ) + "..."
                      : question.question || "No question text available"}
                  </span>
                </div>
              </div>
              <div
                className="d-flex align-items-center gap-5"
                style={{ minWidth: "275px" }}
              >
                <button
                  className={`btn me-3`}
                  style={{
                    minWidth: "80px",
                    backgroundColor: question.isSolved ? "#63F67E" : "#D4DCFF",
                    border: "1px solid black",
                    color: "black",
                  }}
                  onClick={() => {
                    sessionStorage.setItem(
                      "currentQuestionIndex",
                      codingQuestions.indexOf(question).toString()
                    );
                    navigate(navigateTo, { replace: true });
                  }}
                >
                  {question.isSolved ? "Solved" : "Solve"}
                </button>
                <div className="me-3">Score: {question.score}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleNext = useCallback(async () => {
    setDisableStatusNextBtn(true);
    const unlockedSubtopicsArray = JSON.parse(
      sessionStorage.getItem("unlockedSubtopics") || "[]"
    );

    if (unlockedSubtopicsArray.length === 0) {
      navigate("/SubjectOverview", { replace: true });
      return;
    }

    if (!chapters || chapters.length === 0) {
      console.error("No chapters data available.");
      return;
    }

    const currentChapter = chapters[0];
    if (
      !currentChapter.sub_topic_data ||
      currentChapter.sub_topic_data.length === 0
    ) {
      console.error("No subtopics data available.");
      return;
    }

    if (currentView === "lesson") {
      const subTopic = currentChapter.sub_topic_data[currentSubTopicIndex];
      if (subTopic.lesson && currentLessonIndex < subTopic.lesson.length - 1) {
        handleNextLesson();
      } else {
        // Check for next content type in order: notes -> mcq -> coding
        if (subTopic.notes && subTopic.notes.length > 0) {
          handleViewChange("notes");
          setCurrentNotesIndex(0);
        } else if (subTopic.mcqQuestions > 0) {
          handleViewChange("mcq");
          setCurrentMCQIndex(0);
        } else if (subTopic.codingQuestions > 0) {
          handleViewChange("coding");
        } else {
          // No more content in this subtopic, move to next subtopic
          const isLastContent = subTopic.lesson
            ? currentLessonIndex === subTopic.lesson.length - 1
            : true;
          if (isLastContent) {
            try {
              const response3 = await updateLessonStatus(true);

              if (
                response3.message === SUBJECT_ROADMAP.ALREADY_COMPLETED ||
                response3.message === SUBJECT_ROADMAP.UPDATED
              ) {
                const nextSubTopicIndex = currentSubTopicIndex + 1;
                if (nextSubTopicIndex < currentChapter.sub_topic_data.length) {
                  const nextSubTopic =
                    currentChapter.sub_topic_data[nextSubTopicIndex];
                  setUnlockedSubtopics((prev) => {
                    const newSet = new Set(prev);
                    newSet.add(nextSubTopic.subtopicid);
                    sessionStorage.setItem(
                      "unlockedSubtopics",
                      JSON.stringify(Array.from(newSet))
                    );
                    return newSet;
                  });
                  sessionStorage.setItem(
                    "currentSubTopicId",
                    nextSubTopic.subtopicid
                  );
                  sessionStorage.setItem("lastContentType", "lesson");
                  handleSubTopicChange(nextSubTopicIndex, false);
                  setCurrentView("lesson");
                  setCurrentLessonIndex(0);
                  setDisablePreviousBtn(false);
                }
              } else if (response3.message === SUBJECT_ROADMAP.DAY_COMPLETED) {
                navigate("/SubjectOverview", { replace: true });
              } else {
                // Only show modal if there are no incomplete subtopics
                if (
                  !response3.incomplete_sub_topics ||
                  response3.incomplete_sub_topics.length === 0
                ) {
                  setShowUpdateModal(true);
                  setModalMessage(response3.qns_status);
                }
              }
            } catch (innerError: any) {
              console.error("Error fetching update status data:", innerError);
            }
          }
        }
      }
    } else if (currentView === "notes") {
      if (
        currentNotesIndex <
        currentChapter.sub_topic_data[currentSubTopicIndex].notes.length - 1
      ) {
        handleNextNotes();
      } else {
        if (
          currentChapter.sub_topic_data[currentSubTopicIndex].mcqQuestions > 0
        ) {
          handleViewChange("mcq");
          setCurrentMCQIndex(0);
        } else if (
          currentChapter.sub_topic_data[currentSubTopicIndex].codingQuestions >
          0
        ) {
          handleViewChange("coding");
        } else {
          const isLastContent =
            currentNotesIndex ===
            currentChapter.sub_topic_data[currentSubTopicIndex].notes.length -
              1;
          if (isLastContent) {
            try {
              const response3 = await updateLessonStatus(true);

              if (
                response3.message === SUBJECT_ROADMAP.ALREADY_COMPLETED ||
                response3.message === SUBJECT_ROADMAP.UPDATED
              ) {
                const nextSubTopicIndex = currentSubTopicIndex + 1;
                if (nextSubTopicIndex < currentChapter.sub_topic_data.length) {
                  const nextSubTopic =
                    currentChapter.sub_topic_data[nextSubTopicIndex];
                  setUnlockedSubtopics((prev) => {
                    const newSet = new Set(prev);
                    newSet.add(nextSubTopic.subtopicid);
                    sessionStorage.setItem(
                      "unlockedSubtopics",
                      JSON.stringify(Array.from(newSet))
                    );
                    return newSet;
                  });
                  sessionStorage.setItem(
                    "currentSubTopicId",
                    nextSubTopic.subtopicid
                  );
                  sessionStorage.setItem("lastContentType", "lesson");
                  handleSubTopicChange(nextSubTopicIndex, false);
                  setCurrentView("lesson");
                  setCurrentLessonIndex(0);
                  setDisablePreviousBtn(false);
                }
              } else if (response3.message === SUBJECT_ROADMAP.DAY_COMPLETED) {
                navigate("/SubjectOverview", { replace: true });
              } else {
                // Only show modal if there are no incomplete subtopics
                if (
                  !response3.incomplete_sub_topics ||
                  response3.incomplete_sub_topics.length === 0
                ) {
                  setShowUpdateModal(true);
                  setModalMessage(response3.qns_status);
                }
              }
            } catch (innerError: any) {
              console.error("Error fetching update status data:", innerError);
            }
          }
        }
      }
    } else if (currentView === "mcq") {
      // Get the actual number of MCQ questions from the subtopic data
      const currentSubtopic =
        currentChapter.sub_topic_data[currentSubTopicIndex];
      const totalMCQQuestions = currentSubtopic
        ? currentSubtopic.mcqQuestions
        : 0;

      // Ensure we have MCQ questions and we're not on the last one
      const hasMoreMCQs =
        totalMCQQuestions > 0 && currentMCQIndex < totalMCQQuestions - 1;

      if (hasMoreMCQs) {
        handleNextMCQ();
        // Don't reset MCQ interaction when moving to next question within same subtopic
        // Only reset when moving to a different subtopic
      } else {
        // We're on the last MCQ question, check if there are more content types
        const currentSubtopicid = sessionStorage.getItem("currentSubTopicId");
        if (currentSubtopicid) {
          const currentSubtopicIndex = currentChapter.sub_topic_data.findIndex(
            (subTopic) => subTopic.subtopicid === currentSubtopicid
          );
          if (currentSubtopicIndex !== -1) {
            const contentTypes: Array<keyof SubTopic> = [
              "lesson",
              "notes",
              "mcqQuestions",
              "codingQuestions",
            ];
            const contentOrder = contentTypes.filter((type) => {
              const content =
                currentChapter.sub_topic_data[currentSubtopicIndex][type];
              if (Array.isArray(content)) {
                return content.length > 0;
              } else if (typeof content === "number") {
                return content > 0;
              }
              return false;
            });
            const isLastContent =
              contentOrder[contentOrder.length - 1] === "mcqQuestions";

            if (isLastContent) {
              // MCQ is the last content type, call status API
              try {
                const response3 = await updateLessonStatus(true);

                if (
                  response3.message === SUBJECT_ROADMAP.ALREADY_COMPLETED ||
                  response3.message === SUBJECT_ROADMAP.UPDATED
                ) {
                  const nextSubTopicIndex = currentSubTopicIndex + 1;
                  if (
                    nextSubTopicIndex < currentChapter.sub_topic_data.length
                  ) {
                    const nextSubTopic =
                      currentChapter.sub_topic_data[nextSubTopicIndex];
                    setUnlockedSubtopics((prev) => {
                      const newSet = new Set(prev);
                      newSet.add(nextSubTopic.subtopicid);
                      sessionStorage.setItem(
                        "unlockedSubtopics",
                        JSON.stringify(Array.from(newSet))
                      );
                      return newSet;
                    });
                    sessionStorage.setItem(
                      "currentSubTopicId",
                      nextSubTopic.subtopicid
                    );
                    sessionStorage.setItem("lastContentType", "lesson");
                    handleSubTopicChange(nextSubTopicIndex, false);
                    setCurrentView("lesson");
                    setCurrentLessonIndex(0);
                    setDisablePreviousBtn(false);
                  }
                } else if (response3.message === SUBJECT_ROADMAP.DAY_COMPLETED) {
                  navigate("/SubjectOverview", { replace: true });
                } else {
                  // Only show modal if there are no incomplete subtopics
                  if (
                    !response3.incomplete_sub_topics ||
                    response3.incomplete_sub_topics.length === 0
                  ) {
                    setShowUpdateModal(true);
                    setModalMessage(response3.qns_status);
                  }
                }
              } catch (innerError: any) {
                console.error("Error fetching update status data:", innerError);
              }
            } else {
              // There are more content types after MCQ, go to coding
              if (
                currentChapter.sub_topic_data[currentSubTopicIndex]
                  .codingQuestions > 0
              ) {
                handleViewChange("coding");
              }
            }
          }
        }
      }
    } else if (currentView === "coding") {
      const currentSubtopicid = sessionStorage.getItem("currentSubTopicId");
      const subtopic = currentChapter.sub_topic_data.find(
        (st) => st.subtopicid === currentSubtopicid
      );
      if (!subtopic) return false;
      const contentTypes: Array<keyof SubTopic> = [
        "lesson",
        "notes",
        "mcqQuestions",
        "codingQuestions",
      ];
      const contentOrder = contentTypes.filter((type) => {
        const content = subtopic[type];
        if (Array.isArray(content)) {
          return content.length > 0;
        } else if (typeof content === "number") {
          return content > 0;
        }
        return false;
      });
      const isLastContent =
        contentOrder[contentOrder.length - 1] === "codingQuestions";
      if (isLastContent) {
        try {
          const response3 = await updateLessonStatus(true);

          if (
            response3.message === SUBJECT_ROADMAP.ALREADY_COMPLETED ||
            response3.message === SUBJECT_ROADMAP.UPDATED
          ) {
            const nextSubTopicIndex = currentSubTopicIndex + 1;
            if (nextSubTopicIndex < currentChapter.sub_topic_data.length) {
              const nextSubTopic =
                currentChapter.sub_topic_data[nextSubTopicIndex];
              setUnlockedSubtopics((prev) => {
                const newSet = new Set(prev);
                newSet.add(nextSubTopic.subtopicid);
                sessionStorage.setItem(
                  "unlockedSubtopics",
                  JSON.stringify(Array.from(newSet))
                );
                return newSet;
              });
              sessionStorage.setItem(
                "currentSubTopicId",
                nextSubTopic.subtopicid
              );
              sessionStorage.setItem("lastContentType", "lesson");
              handleSubTopicChange(nextSubTopicIndex, false);
              setCurrentView("lesson");
              setCurrentLessonIndex(0);
              setDisablePreviousBtn(false);
            }
          } else if (response3.message === SUBJECT_ROADMAP.DAY_COMPLETED) {
            navigate("/SubjectOverview", { replace: true });
          } else {
            // Only show modal if there are no incomplete subtopics
            if (
              !response3.incomplete_sub_topics ||
              response3.incomplete_sub_topics.length === 0
            ) {
              setShowUpdateModal(true);
              setModalMessage(response3.qns_status);
            }
          }
        } catch (innerError: any) {
          console.error("Error fetching update status data:", innerError);
        }
      } else {
        setDisablePreviousBtn(true);
        try {
          const response3 = await updateLessonStatus(true);

          if (
            response3.message === SUBJECT_ROADMAP.ALREADY_COMPLETED ||
            response3.message === SUBJECT_ROADMAP.UPDATED
          ) {
            setDisablePreviousBtn(false);
          } else if (response3.message === SUBJECT_ROADMAP.DAY_COMPLETED) {
            navigate("/SubjectOverview", { replace: true });
          } else {
            // Only show modal if there are no incomplete subtopics
            if (
              !response3.incomplete_sub_topics ||
              response3.incomplete_sub_topics.length === 0
            ) {
              setShowUpdateModal(true);
              setModalMessage(response3.qns_status);
            }
          }
        } catch (innerError: any) {
          console.error("Error fetching update status data:", innerError);
        }
      }
    }
    setDisableStatusNextBtn(false);
  }, [
    currentView,
    currentLessonIndex,
    currentNotesIndex,
    currentMCQIndex,
    chapters,
    currentSubTopicIndex,
    fetchMCQQuestions,
    fetchCodingQuestions,
    handleViewChange,
    navigate,
    studentId,
    subject,
    subjectId,
    dayNumber,
    weekNumber,
  ]);

  const handlePrevious = useCallback(async () => {
    if (currentView === "lesson") {
      if (currentLessonIndex > 0) {
        handlePreviousLesson();
      } else if (currentSubTopicIndex > 0) {
        // Go to last content of previous subtopic
        const prevSubTopicIndex = currentSubTopicIndex - 1;
        const prevSubTopic = chapters[0].sub_topic_data[prevSubTopicIndex];
        sessionStorage.removeItem("lastContentType");
        // Update currentSubTopicId to the previous subtopic
        sessionStorage.setItem("currentSubTopicId", prevSubTopic.subtopicid);
        // Find last available content type in order: coding, mcq, notes, lesson
        if (prevSubTopic.codingQuestions > 0) {
          setCurrentSubTopicIndex(prevSubTopicIndex);
          setCurrentView("coding");
          sessionStorage.setItem("lastContentType", "coding");
          fetchCodingQuestions(prevSubTopicIndex);
          setHasFetched(true);
        } else if (prevSubTopic.mcqQuestions > 0) {
          setCurrentSubTopicIndex(prevSubTopicIndex);
          setCurrentMCQIndex(prevSubTopic.mcqQuestions - 1);
          setCurrentView("mcq");
          sessionStorage.setItem("lastContentType", "mcq");
          fetchMCQQuestions(prevSubTopicIndex);
          setHasFetched(true);
        } else if (prevSubTopic.notes && prevSubTopic.notes.length > 0) {
          setCurrentSubTopicIndex(prevSubTopicIndex);
          setCurrentNotesIndex(prevSubTopic.notes.length - 1);
          setCurrentView("notes");
          sessionStorage.setItem("lastContentType", "notes");
          const noteId = prevSubTopic.notes[prevSubTopic.notes.length - 1];
          setCurrentNoteId(noteId);
        } else if (prevSubTopic.lesson && prevSubTopic.lesson.length > 0) {
          setCurrentSubTopicIndex(prevSubTopicIndex);
          setCurrentLessonIndex(prevSubTopic.lesson.length - 1);
          setCurrentView("lesson");
          sessionStorage.setItem("lastContentType", "lesson");
        }
      }
    } else if (currentView === "notes") {
      if (currentNotesIndex > 0) {
        handlePreviousNotes();
      } else {
        // Check for prior content in current subtopic
        const currentSubTopic =
          chapters[0].sub_topic_data[currentSubTopicIndex];
        if (currentSubTopic.lesson && currentSubTopic.lesson.length > 0) {
          handleViewChange("lesson");
          setCurrentLessonIndex(currentSubTopic.lesson.length - 1);
        } else if (currentSubTopicIndex > 0) {
          // Go to last content of previous subtopic
          const prevSubTopicIndex = currentSubTopicIndex - 1;
          const prevSubTopic = chapters[0].sub_topic_data[prevSubTopicIndex];
          sessionStorage.removeItem("lastContentType");
          if (prevSubTopic.codingQuestions > 0) {
            setCurrentSubTopicIndex(prevSubTopicIndex);
            setCurrentView("coding");
            sessionStorage.setItem("lastContentType", "coding");
            fetchCodingQuestions(prevSubTopicIndex);
            setHasFetched(true);
          } else if (prevSubTopic.mcqQuestions > 0) {
            setCurrentSubTopicIndex(prevSubTopicIndex);
            setCurrentMCQIndex(prevSubTopic.mcqQuestions - 1);
            setCurrentView("mcq");
            sessionStorage.setItem("lastContentType", "mcq");
            fetchMCQQuestions(prevSubTopicIndex);
            setHasFetched(true);
          } else if (prevSubTopic.notes && prevSubTopic.notes.length > 0) {
            setCurrentSubTopicIndex(prevSubTopicIndex);
            setCurrentNotesIndex(prevSubTopic.notes.length - 1);
            setCurrentView("notes");
            sessionStorage.setItem("lastContentType", "notes");
            const noteId = prevSubTopic.notes[prevSubTopic.notes.length - 1];
            setCurrentNoteId(noteId);
          } else if (prevSubTopic.lesson && prevSubTopic.lesson.length > 0) {
            setCurrentSubTopicIndex(prevSubTopicIndex);
            setCurrentLessonIndex(prevSubTopic.lesson.length - 1);
            setCurrentView("lesson");
            sessionStorage.setItem("lastContentType", "lesson");
          }
        }
      }
    } else if (currentView === "mcq") {
      if (currentMCQIndex > 0) {
        handlePreviousMCQ();
      } else {
        // Check for prior content in current subtopic
        const currentSubTopic =
          chapters[0].sub_topic_data[currentSubTopicIndex];
        if (currentSubTopic.notes && currentSubTopic.notes.length > 0) {
          handleViewChange("notes");
          setCurrentNotesIndex(currentSubTopic.notes.length - 1);
        } else if (
          currentSubTopic.lesson &&
          currentSubTopic.lesson.length > 0
        ) {
          handleViewChange("lesson");
          setCurrentLessonIndex(currentSubTopic.lesson.length - 1);
        } else if (currentSubTopicIndex > 0) {
          // Go to last content of previous subtopic
          const prevSubTopicIndex = currentSubTopicIndex - 1;
          const prevSubTopic = chapters[0].sub_topic_data[prevSubTopicIndex];
          sessionStorage.removeItem("lastContentType");
          // Update currentSubTopicId to the previous subtopic
          sessionStorage.setItem("currentSubTopicId", prevSubTopic.subtopicid);
          if (prevSubTopic.codingQuestions > 0) {
            setCurrentSubTopicIndex(prevSubTopicIndex);
            setCurrentView("coding");
            sessionStorage.setItem("lastContentType", "coding");
            fetchCodingQuestions(prevSubTopicIndex);
            setHasFetched(true);
          } else if (prevSubTopic.mcqQuestions > 0) {
            setCurrentSubTopicIndex(prevSubTopicIndex);
            setCurrentMCQIndex(prevSubTopic.mcqQuestions - 1);
            setCurrentView("mcq");
            sessionStorage.setItem("lastContentType", "mcq");
            fetchMCQQuestions(prevSubTopicIndex);
            setHasFetched(true);
          } else if (prevSubTopic.notes && prevSubTopic.notes.length > 0) {
            setCurrentSubTopicIndex(prevSubTopicIndex);
            setCurrentNotesIndex(prevSubTopic.notes.length - 1);
            setCurrentView("notes");
            sessionStorage.setItem("lastContentType", "notes");
            const noteId = prevSubTopic.notes[prevSubTopic.notes.length - 1];
            setCurrentNoteId(noteId);
          } else if (prevSubTopic.lesson && prevSubTopic.lesson.length > 0) {
            setCurrentSubTopicIndex(prevSubTopicIndex);
            setCurrentLessonIndex(prevSubTopic.lesson.length - 1);
            setCurrentView("lesson");
            sessionStorage.setItem("lastContentType", "lesson");
          }
        }
      }
    } else if (currentView === "coding") {
      // Check for prior content in current subtopic
      const currentSubTopic = chapters[0].sub_topic_data[currentSubTopicIndex];
      if (currentSubTopic.mcqQuestions > 0) {
        handleViewChange("mcq");
        setCurrentMCQIndex(mcqQuestions.length - 1);
      } else if (currentSubTopic.notes && currentSubTopic.notes.length > 0) {
        handleViewChange("notes");
        setCurrentNotesIndex(currentSubTopic.notes.length - 1);
      } else if (currentSubTopic.lesson && currentSubTopic.lesson.length > 0) {
        handleViewChange("lesson");
        setCurrentLessonIndex(currentSubTopic.lesson.length - 1);
      } else if (currentSubTopicIndex > 0) {
        // Go to last content of previous subtopic
        const prevSubTopicIndex = currentSubTopicIndex - 1;
        const prevSubTopic = chapters[0].sub_topic_data[prevSubTopicIndex];
        sessionStorage.removeItem("lastContentType");
        // Update currentSubTopicId to the previous subtopic
        sessionStorage.setItem("currentSubTopicId", prevSubTopic.subtopicid);
        if (prevSubTopic.codingQuestions > 0) {
          setCurrentSubTopicIndex(prevSubTopicIndex);
          setCurrentView("coding");
          sessionStorage.setItem("lastContentType", "coding");
          fetchCodingQuestions(prevSubTopicIndex);
          setHasFetched(true);
        } else if (prevSubTopic.mcqQuestions > 0) {
          setCurrentSubTopicIndex(prevSubTopicIndex);
          setCurrentMCQIndex(prevSubTopic.mcqQuestions - 1);
          setCurrentView("mcq");
          sessionStorage.setItem("lastContentType", "mcq");
          fetchMCQQuestions(prevSubTopicIndex);
          setHasFetched(true);
        } else if (prevSubTopic.notes && prevSubTopic.notes.length > 0) {
          setCurrentSubTopicIndex(prevSubTopicIndex);
          setCurrentNotesIndex(prevSubTopic.notes.length - 1);
          setCurrentView("notes");
          sessionStorage.setItem("lastContentType", "notes");
          const noteId = prevSubTopic.notes[prevSubTopic.notes.length - 1];
          setCurrentNoteId(noteId);
        } else if (prevSubTopic.lesson && prevSubTopic.lesson.length > 0) {
          setCurrentSubTopicIndex(prevSubTopicIndex);
          setCurrentLessonIndex(prevSubTopic.lesson.length - 1);
          setCurrentView("lesson");
          sessionStorage.setItem("lastContentType", "lesson");
        }
      }
    }
  }, [
    currentView as string,
    currentLessonIndex as number,
    currentNotesIndex as number,
    currentMCQIndex as number,
    chapters as Chapter[],
    currentSubTopicIndex as number,
    handlePreviousLesson as () => void,
    handlePreviousNotes as () => void,
    handlePreviousMCQ as () => void,
    handleViewChange as (view: string) => void,
    mcqQuestions.length as number,
  ]);

  const SidebarComponent = () => {
    if (error || !chapters.length) {
      return (
        <div
          className="border border-muted rounded-2 me-3 d-flex flex-column"
          style={{
            width: "25%",
            height: "calc(100% - 10px)",
            overflow: "auto",
            flexShrink: 0,
          }}
        >
          <div className="border-bottom border-muted p-3 text-center">
            <Skeleton height={20} />
          </div>
        </div>
      );
    }

    const expandedSectionsString = expandedSections.map((index) =>
      index.toString()
    );
    const currentSubTopicId = sessionStorage.getItem("currentSubTopicId") || "";

    return (
      <div
        className="border border-muted rounded-2 me-2 d-flex flex-column content-transition"
        style={{
          width: "25%",
          height: "100%",
          overflow: "auto",
          flexShrink: 0,
          boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
          backgroundColor: "transparent",
        }}
      >
        <div className="border-bottom border-muted">
          <div className="d-flex justify-content-between align-items-center px-3 pe-1 py-2">
            <h6
              className="mb-0 fw-semibold"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "68%",
                flex: "1",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                if (target.scrollWidth > target.clientWidth) {
                  target.title = `${chapters[0].Day}: ${chapters[0].title}`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.title = "";
              }}
            >
              {chapters[0].Day}: {chapters[0].title}
            </h6>
            <div className="d-flex align-items-center">
              <span className="badge bg-primary me-2">
                {chapters[0].duration}hr
              </span>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={handleToggle}
              >
                <TfiMenuAlt size={20} />
              </button>
            </div>
          </div>
        </div>
        <div className="flex-grow-1 overflow-auto">
          <Accordion
            activeKey={expandedSection}
            onSelect={(key) => setExpandedSection((key as string) ?? null)}
          >
            {chapters[0].sub_topic_data.map((subTopic, index) => (
              <Accordion.Item key={index} eventKey={index.toString()}>
                <Accordion.Header className="py-1">
                  <span
                    style={{
                      fontSize: "14px",
                      width: "80%",
                      fontWeight: "500",
                      color: incompleteSubtopics.includes(subTopic.subtopicid)
                        ? "orange"
                        : "inherit",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: "#666",
                      }}
                    >
                      {index + 1}.
                    </span>{" "}
                    {subTopic.sub_topic}
                  </span>
                  <CiSquareChevUp size={16} className="accordion-icon" />
                </Accordion.Header>
                <Accordion.Body className="py-1">
                  <div className="px-1">
                    {/* Dynamic content rendering based on data order */}
                    {(() => {
                      const contentItems: Array<{
                        type: "lesson" | "notes" | "mcq" | "coding";
                        index: number;
                        icon: React.ReactElement;
                        label: string;
                      }> = [];

                      // Add lessons with dynamic labels
                      if (subTopic.lesson && subTopic.lesson.length > 0) {
                        subTopic.lesson.forEach((_, lessonIndex) => {
                          contentItems.push({
                            type: "lesson",
                            index: lessonIndex,
                            icon: (
                              <PiMonitorPlayBold
                                size={20}
                                style={{ marginRight: "10px" }}
                              />
                            ),
                            label: getContentLabel(
                              "lesson",
                              subTopic.lesson.length,
                              lessonIndex
                            ),
                          });
                        });
                      }

                      // Add notes with dynamic labels
                      if (subTopic.notes && subTopic.notes.length > 0) {
                        subTopic.notes.forEach((_, notesIndex) => {
                          contentItems.push({
                            type: "notes",
                            index: notesIndex,
                            icon: (
                              <SlNotebook
                                size={20}
                                style={{ marginRight: "10px" }}
                              />
                            ),
                            label: getContentLabel(
                              "notes",
                              subTopic.notes.length,
                              notesIndex
                            ),
                          });
                        });
                      }

                      // Add MCQ if available
                      if (subTopic.mcqQuestions > 0) {
                        contentItems.push({
                          type: "mcq",
                          index: 0,
                          icon: (
                            <BsListTask
                              size={20}
                              style={{ marginRight: "10px" }}
                            />
                          ),
                          label: getContentLabel(
                            "mcq",
                            subTopic.mcqQuestions,
                            0
                          ),
                        });
                      }

                      // Add coding if available
                      if (subTopic.codingQuestions > 0) {
                        contentItems.push({
                          type: "coding",
                          index: 0,
                          icon: (
                            <LiaLaptopCodeSolid
                              size={25}
                              style={{ marginRight: "5px" }}
                            />
                          ),
                          label: getContentLabel(
                            "coding",
                            subTopic.codingQuestions,
                            0
                          ),
                        });
                      }

                      return contentItems.map((item, itemIndex) => {
                        // Determine if this specific item should be highlighted
                        const isHighlighted = (() => {
                          if (subTopic.subtopicid !== currentSubTopicId)
                            return false;
                          if (currentView !== item.type) return false;

                          // For lessons and notes, check the specific index
                          if (item.type === "lesson") {
                            return currentLessonIndex === item.index;
                          } else if (item.type === "notes") {
                            return currentNotesIndex === item.index;
                          }

                          // For MCQ and coding, just check the type (since they don't have multiple indices)
                          return true;
                        })();

                        return (
                          <div
                            key={`${item.type}-${item.index}`}
                            className={`d-flex align-items-center sidebar-item p-1 ${
                              isHighlighted ? "active" : ""
                            }`}
                            style={{
                              color: isHighlighted ? "#2196f3" : "#333",
                              cursor: unlockedSubtopics.has(subTopic.subtopicid)
                                ? "pointer"
                                : "not-allowed",
                              opacity: unlockedSubtopics.has(
                                subTopic.subtopicid
                              )
                                ? 1
                                : 0.5,
                              marginBottom: "1px",
                              borderRadius: "4px",
                              fontSize: "13px",
                            }}
                            onClick={(event) => {
                              if (unlockedSubtopics.has(subTopic.subtopicid)) {
                                handleSubTopicContentClick(
                                  event,
                                  index,
                                  item.type as
                                    | "lesson"
                                    | "notes"
                                    | "mcq"
                                    | "coding",
                                  item.index
                                );
                              }
                            }}
                          >
                            <span
                              style={{
                                marginRight: "8px",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {item.icon}
                            </span>
                            <span className="fw-medium">{item.label}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      </div>
    );
  };

  const SidebarComponentBar = () => {
    return (
      <div className="  d-flex flex-column" style={{ flexShrink: 0 }}>
        <div className="  ">
          <button className="btn" onClick={handleToggle}>
            <TfiMenuAlt size={25} />
          </button>
        </div>
      </div>
    );
  };

  const handleSubTopicContentClick = useCallback(
    async (
      event: React.MouseEvent,
      index: number,
      contentType: "lesson" | "notes" | "mcq" | "coding",
      itemIndex: number = 0
    ) => {
      event.stopPropagation();

      const subTopic = chapters[0].sub_topic_data[index];
      sessionStorage.setItem("currentSubTopicId", subTopic.subtopicid);

      setCurrentSubTopicIndex(index);
      setCurrentContentType(contentType);

      // Clear questions when switching subtopics
      if (currentSubTopicIndex !== index) {
        setMcqQuestions([]);
        setCodingQuestions([]);
        setHasFetched(false);
        // Clear the last content type when switching subtopics
        sessionStorage.removeItem("lastContentType");
      }

      if (
        contentType === "lesson" &&
        subTopic.lesson &&
        subTopic.lesson.length > 0
      ) {
        setCurrentLessonIndex(itemIndex);
      } else if (
        contentType === "notes" &&
        subTopic.notes &&
        subTopic.notes.length > 0
      ) {
        const noteId = subTopic.notes[itemIndex];
        setCurrentNoteId(noteId);
        setContentType("notes");
        setCurrentNotesIndex(itemIndex);
      } else if (contentType === "mcq") {
        // Always fetch MCQ questions when switching to MCQ view
        await fetchMCQQuestions(index);
        setCurrentMCQIndex(0);
        setHasFetched(true);
      } else if (contentType === "coding") {
        // Always fetch coding questions when switching to coding view
        await fetchCodingQuestions(index);
        setHasFetched(true);
      }

      handleViewChange(contentType);
    },
    [
      chapters,
      fetchMCQQuestions,
      fetchCodingQuestions,
      hasFetched,
      currentSubTopicIndex,
    ]
  );

  const [requestedContent, setRequestedContent] = useState<string[]>([]);

  useEffect(() => {
    // Only run this effect if we have chapters loaded (meaning initial logic has run)
    if (chapters.length === 0) {
      return;
    }

    const requestedContentTypes =
      sessionStorage.getItem("lastContentType") || "";
    if (sessionStorage.getItem("currentSubTopicId") != null && !hasFetched) {
      if (requestedContentTypes.includes("mcq") && mcqQuestions.length === 0) {
        fetchMCQQuestions(0);
      }

      if (
        requestedContentTypes.includes("coding") &&
        codingQuestions.length === 0
      ) {
        fetchCodingQuestions(0);
      }

      setHasFetched(true);
    }
  }, [
    chapters,
    studentId,
    subject,
    dayNumber,
    requestedContent,
    hasFetched,
    mcqQuestions.length,
    codingQuestions.length,
    fetchMCQQuestions,
    fetchCodingQuestions,
  ]);

  // Effect to handle MCQ view when questions are not loaded
  useEffect(() => {
    if (currentView === "mcq" && mcqQuestions.length === 0 && !loading) {
      fetchMCQQuestions(currentSubTopicIndex);
    }
  }, [
    currentView,
    mcqQuestions.length,
    loading,
    currentSubTopicIndex,
    fetchMCQQuestions,
  ]);

  // Removed conflicting validation effect - logic is now handled in initial data loading

  // Removed conflicting video priority effect - logic is now handled in initial data loading

  // Effect to ensure sidebar updates when currentView changes
  useEffect(() => {
    // Force re-render of sidebar when currentView changes
    // This ensures the highlighting updates properly
  }, [currentView, currentLessonIndex, currentNotesIndex, currentMCQIndex]);

  // Effect to ensure sidebar stays expanded for current subtopic
  useEffect(() => {
    if (chapters.length > 0 && currentSubTopicIndex >= 0) {
      setExpandedSection(currentSubTopicIndex.toString());
    }
  }, [chapters, currentSubTopicIndex]);
  
  // Cleanup VdoCipher time tracking when video changes
  useEffect(() => {
    return () => {
      // Cleanup time tracking when component unmounts or video changes
      if ((window as any).cleanupVdoCipherTracking) {
        (window as any).cleanupVdoCipherTracking();
        delete (window as any).cleanupVdoCipherTracking;
      }
      
      // Clean up any stored player references on iframes
      const iframes = document.querySelectorAll('iframe[src*="player.vdocipher.com"]');
      iframes.forEach((iframe) => {
        if ((iframe as any).vdocipherPlayer) {
          delete (iframe as any).vdocipherPlayer;
        }
      });
      
      setVideoTimeTracking({
        totalPlayed: 0,
        totalCovered: 0,
        isTracking: false
      });
    };
  }, [currentVideoId, currentLessonIndex]);

  return (
    <div
      className="subject-roadmap-page container-fluid p-0"
      style={{
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#f2eeee",
      }}
    >
      <div
        className="p-0 my-0"
        style={{
          backgroundColor: "#f0f0f0",
          height: "100%",
          overflow: "hidden",
          padding: "7px",
        }}
      >
        <div
          className="container-fluid p-0 pt-2 pe-2"
          style={{
            maxWidth: "100%",
            overflow: "hidden",
            backgroundColor: "#f0f0f0",
            height: "100%",
          }}
        >
          <div className="row g-0" style={{ height: "100%" }}>
            <div className="col-12" style={{ height: "100%" }}>
              <div
                className="bg-white border border-muted rounded-2 py-2"
                style={{
                  height: "calc(100vh - 55px)",
                  overflow: "hidden",
                  paddingTop: "8px",
                  paddingBottom: "8px",
                }}
              >
                <div
                  className="d-flex"
                  style={{ height: "calc(100vh - 110px)" }}
                >
                  {currentView === "lesson" && (
                    <div
                      className="flex-grow-1 me-2 d-flex flex-column"
                      style={{ height: "100%" }}
                    >
                      <div
                        className="border border-muted rounded-2 ms-2 d-flex flex-column content-transition video-container"
                        style={{
                          height: "100%",
                          overflow: "hidden",
                          boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
                          backgroundColor: "transparent",
                        }}
                      >
                        {/* Header with subtopic name and content type */}
                        <div
                          className="border-bottom border-muted px-3 py-2 d-flex justify-content-between align-items-center"
                          style={{ minHeight: "35px" }}
                        >
                          <div className="d-flex align-items-center">
                            <span
                              className="me-2 fs-5"
                              style={{ display: "flex", alignItems: "center" }}
                            >
                              {getContentTypeIcon("lesson")}
                            </span>
                            <h6 className="m-0 fw-semibold">
                              {getCurrentSubTopicName()}
                            </h6>
                          </div>
                          <div className="text-muted d-flex align-items-center gap-2">
                            <small className="badge bg-light text-dark px-2 py-1 rounded-pill">
                              {getContentLabel("lesson", 1)}
                            </small>
                            
                          </div>
                        </div>
                        <div
                          className="flex-grow-1"
                          style={{
                            minHeight: "0",
                            flex: "1 1 auto",
                            maxHeight: "100%",
                            overflow: "auto",
                          }}
                        >
                          {renderLessonContent()}
                        </div>
                      </div>
                    </div>
                  )}
                  {currentView === "notes" && (
                    <div
                      className="flex-grow-1 me-2 d-flex flex-column"
                      style={{ height: "100%" }}
                    >
                      <div
                        className="border border-muted rounded-2 ms-2 d-flex flex-column content-transition"
                        style={{
                          height: "100%",
                          overflow: "hidden",
                          boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
                          backgroundColor: "transparent",
                        }}
                      >
                        {/* Header with subtopic name and content type */}
                        <div
                          className="border-bottom border-muted px-3 py-2 d-flex justify-content-between align-items-center"
                          style={{ minHeight: "35px" }}
                        >
                          <div className="d-flex align-items-center">
                            <span
                              className="me-2 fs-5"
                              style={{ display: "flex", alignItems: "center" }}
                            >
                              {getContentTypeIcon("notes")}
                            </span>
                            <h6 className="m-0 fw-semibold">
                              {getCurrentSubTopicName()}
                            </h6>
                          </div>
                          <div className="text-muted">
                            <small className="badge bg-light text-dark px-2 py-1 rounded-pill">
                              {getContentLabel("notes", 1)}
                            </small>
                          </div>
                        </div>
                        <div
                          className="flex-grow-1 scrollable-content"
                          style={{
                            minHeight: "0",
                            flex: "1 1 auto",
                            height: "calc(100vh - 200px)",
                            overflow: "auto",
                          }}
                        >
                          {renderNotesContent()}
                        </div>
                      </div>
                    </div>
                  )}
                  {currentView === "mcq" &&
                    (() => {
                      if (mcqQuestions.length > 0) {
                        return (
                          <div
                            className="flex-grow-1 me-2 d-flex flex-column"
                            style={{ height: "100%" }}
                          >
                            <div
                              className="border border-muted rounded-2 ms-2 d-flex flex-column content-transition"
                              style={{
                                height: "100%",
                                overflow: "hidden",
                                boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
                                backgroundColor: "transparent",
                                maxHeight: "100%",
                              }}
                            >
                              {/* Header with subtopic name and content type */}
                              <div
                                className="border-bottom border-muted px-3 py-2 d-flex justify-content-between align-items-center"
                                style={{ minHeight: "35px" }}
                              >
                                <div className="d-flex align-items-center">
                                  <span
                                    className="me-2 fs-5"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    {getContentTypeIcon("mcq")}
                                  </span>
                                  <h6 className="m-0 fw-semibold">
                                    {getCurrentSubTopicName()}
                                  </h6>
                                </div>
                                <div className="text-muted">
                                  <small className="badge bg-light text-dark px-2 py-1 rounded-pill">
                                    {getContentLabel("mcq", 1)}
                                  </small>
                                </div>
                              </div>
                              <div
                                className="flex-grow-1 scrollable-content mcq-container"
                                style={{
                                  minHeight: "0",
                                  flex: "1 1 auto",
                                  maxHeight: "100%",
                                  overflow: "auto",
                                }}
                              >
                                {renderMCQContent()}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div
                            className="flex-grow-1 me-2 d-flex flex-column"
                            style={{ height: "100%" }}
                          >
                            <div
                              className="border border-muted rounded-2 ms-2 d-flex flex-column content-transition"
                              style={{
                                height: "100%",
                                overflow: "hidden",
                                boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
                                backgroundColor: "transparent",
                                maxHeight: "100%",
                              }}
                            >
                              {/* Header with subtopic name and content type */}
                              <div
                                className="border-bottom border-muted px-3 py-2 d-flex justify-content-between align-items-center"
                                style={{ minHeight: "35px" }}
                              >
                                <div className="d-flex align-items-center">
                                  <span
                                    className="me-2 fs-5"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    {getContentTypeIcon("mcq")}
                                  </span>
                                  <h6 className="m-0 fw-semibold">
                                    {getCurrentSubTopicName()}
                                  </h6>
                                </div>
                                <div className="text-muted">
                                  <small className="badge bg-light text-dark px-2 py-1 rounded-pill">
                                    {getContentLabel("mcq", 1)}
                                  </small>
                                </div>
                              </div>
                              <div
                                className="flex-grow-1 scrollable-content mcq-container"
                                style={{
                                  minHeight: "0",
                                  flex: "1 1 auto",
                                  maxHeight: "100%",
                                  overflow: "auto",
                                }}
                              >
                                <div></div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  {currentView === "coding" &&
                    (codingQuestions.length > 0 ? (
                      <div
                        className="flex-grow-1 me-2 d-flex flex-column"
                        style={{ height: "100%" }}
                      >
                        <div
                          className="border border-muted rounded-2 ms-2 d-flex flex-column content-transition"
                          style={{
                            height: "100%",
                            overflow: "hidden",
                            boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
                            backgroundColor: "transparent",
                            maxHeight: "100%",
                          }}
                        >
                          {/* Header with subtopic name and content type */}
                          <div
                            className="border-bottom border-muted px-3 py-2 d-flex justify-content-between align-items-center"
                            style={{ minHeight: "35px" }}
                          >
                            <div className="d-flex align-items-center">
                              <span
                                className="me-2 fs-5"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                {getContentTypeIcon("coding")}
                              </span>
                              <h6 className="m-0 fw-semibold">
                                {getCurrentSubTopicName()}
                              </h6>
                            </div>
                            <div className="text-muted">
                              <small className="badge bg-light text-dark px-2 py-1 rounded-pill">
                                {getContentLabel("coding", 1)}
                              </small>
                            </div>
                          </div>
                          <div
                            className="flex-grow-1 scrollable-content coding-container"
                            style={{
                              minHeight: "0",
                              flex: "1 1 auto",
                              maxHeight: "100%",
                              overflow: "auto",
                            }}
                          >
                            {renderCodingContent()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex-grow-1 me-2 d-flex flex-column"
                        style={{ height: "100%" }}
                      >
                        <div
                          className="border border-muted rounded-2 ms-2 d-flex flex-column content-transition"
                          style={{
                            height: "100%",
                            overflow: "hidden",
                            boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
                            backgroundColor: "transparent",
                            maxHeight: "100%",
                          }}
                        >
                          {/* Header with subtopic name and content type */}
                          <div
                            className="border-bottom border-muted px-3 py-2 d-flex justify-content-between align-items-center"
                            style={{ minHeight: "35px" }}
                          >
                            <div className="d-flex align-items-center">
                              <span
                                className="me-2 fs-5"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                {getContentTypeIcon("coding")}
                              </span>
                              <h6 className="m-0 fw-semibold">
                                {getCurrentSubTopicName()}
                              </h6>
                            </div>
                            <div className="text-muted">
                              <small className="badge bg-light text-dark px-2 py-1 rounded-pill">
                                {getContentLabel("coding", 1)}
                              </small>
                            </div>
                          </div>
                          <div
                            className="flex-grow-1 scrollable-content coding-container"
                            style={{
                              minHeight: "0",
                              flex: "1 1 auto",
                              maxHeight: "100%",
                              overflow: "auto",
                            }}
                          >
                            <div></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  {isActive ? SidebarComponent() : SidebarComponentBar()}
                </div>
                <div
                  className="d-flex justify-content-between  py-1"
                  style={{
                    height: "45px",
                    marginTop: "2px",
                    marginBottom: "5px",
                  }}
                >
                  <button
                    className="btn btn-sm btn-outline-light PN-button text-light px-3 py-1 mx-2 rounded-2"
                    style={{
                      fontSize: "13px",
                      height: "35px",
                      width: "80px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                    }}
                    onClick={handlePrevious}
                    disabled={isPreviousButtonDisabled() || disablePreviousBtn}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-sm btn-outline-light PN-button text-light px-3 py-1 mx-2 rounded-2"
                    style={{
                      fontSize: "13px",
                      height: "35px",
                      width: "80px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                    }}
                    onClick={handleNext}
                    disabled={disableStatusNextBtn}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {loading && (
        <div className="loading-overlay">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}
      <Modal
        className="my-5"
        centered
        show={showUpdateModal}
        onHide={() => setShowUpdateModal(false)}
      >
        <Modal.Header
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
          className="bg-warning"
        >
          <Modal.Title className="ModalTitle" style={{ fontSize: "20px" }}>
            <FaExclamationTriangle size={20} className="mb-1 blink" />{" "}
            {modalMessage.includes("You have not completed")
              ? "Incomplete Subtopics"
              : "Message"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3 text-center">
          <pre style={{ fontSize: "18px", whiteSpace: "pre-wrap" }}>
            {modalMessage}
          </pre>
          <div className="d-flex justify-content-center pt-3">
            <button
              className="btn btn-secondary"
              onClick={() => setShowUpdateModal(false)}
            >
              Close
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default SubjectRoadMap;
