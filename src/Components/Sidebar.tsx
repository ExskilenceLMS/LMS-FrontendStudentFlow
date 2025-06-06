import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import RaiseTicket from "../RaiseTicket";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";
import { BiBookReader } from "react-icons/bi";
import { TbUserScreen } from "react-icons/tb";
import { BsViewStacked } from "react-icons/bs";
import { SiLintcode } from "react-icons/si";
import { TbProgressHelp } from "react-icons/tb";
import { TfiTicket } from "react-icons/tfi";
import { GrFormView } from "react-icons/gr";

interface SubMenu {
  icon: React.ReactNode;
  label: string;
  path?: string;
  active?: string[];
  onClick?: () => void;
}

interface Menu {
  icon: React.ReactNode;
  label: string;
  path?: string;
  subMenu?: SubMenu[];
  paths?: string[];
  disableClickOnSubMenu?: boolean;
}

interface SidebarProps {
  show: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ show, toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMainMenu, setActiveMainMenu] = useState<string | null>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [showBugReport, setShowBugReport] = useState<boolean>(false);
  const [hoverMenu, setHoverMenu] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ top: 0, left: 0 });
  const [hoverItemHeight, setHoverItemHeight] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pathname = location.pathname;

  const encryptedStudentId = sessionStorage.getItem("StudentId");
  let decryptedStudentId = null;

  if (encryptedStudentId) {
    decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8);
  } else {
    // console.error("StudentId is not set in sessionStorage");
  }

  const studentId = decryptedStudentId;

  const handleReportBug = () => {
    setShowBugReport(true);
  };

  const sidebarItems: Menu[] = [
    { icon: <BiBookReader size={20} />, label: "My Courses", path: "Dashboard", paths: ["/Dashboard"] },
    { icon: <TbUserScreen size={20} />, label: "Online Sessions", path: "online-session", paths: ["/online-session"] },
    { icon: <SiLintcode size={20} />, label: "Tests", path: "test", paths: ["/test"] },
    {
      icon: <TfiTicket size={20} />,
      label: "Tickets",
      subMenu: [
        { icon: <BsViewStacked />, label: "Raise Ticket", onClick: handleReportBug },
        { icon: <GrFormView size={20} />, label: "View Ticket", path: "report-problem" },
      ],
      paths: ["/report-problem"],
      disableClickOnSubMenu: true
    },
    { icon: <TbProgressHelp size={20} />, label: "FAQ", path: "", paths: [""] },
  ];

  const topItems = sidebarItems.slice(0, -2);
  const bottomItems = sidebarItems.slice(-2);

  useEffect(() => {
    sidebarItems.forEach((item) => {
      if (item.paths?.includes(pathname)) {
        setActiveMainMenu(item.label);
      }
    });
  }, [pathname]);

  useEffect(() => {
    const storedActiveMenu = sessionStorage.getItem("activeMainMenu");
    if (storedActiveMenu) {
      setActiveMainMenu(storedActiveMenu);
    }
  }, []);

  useEffect(() => {
    if (activeMainMenu) {
      sessionStorage.setItem("activeMainMenu", activeMainMenu);
    }
  }, [activeMainMenu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setHoverMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSubMenuItemClick = (subItem: SubMenu) => {
    if (subItem.onClick) {
      subItem.onClick();
    } else if (subItem.path) {
      navigate(`/${subItem.path}`);
      setActiveSubMenu(subItem.label);
    }
    setHoverMenu(null);
  };

  const isSubMenuActive = (subItem: SubMenu) => {
    if (subItem.active) {
      return subItem.active.includes(pathname.split("/")[1]);
    }
    return pathname === `/${subItem.path}`;
  };

  const handleMouseEnter = (item: Menu, event: React.MouseEvent) => {
    if (item.subMenu && item.subMenu.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      const left = show ? rect.right + 8 : rect.right + 8;
      const top = rect.top;
      setHoverMenu(item.label);
      setHoverPosition({ top, left });
      setHoverItemHeight(rect.height);
    }
  };

  const handleMouseLeave = () => {
    setTimeout(() => {
      if (!popupRef.current?.matches(":hover")) {
        setHoverMenu(null);
      }
    }, 100);
  };

  const renderMenuItems = (items: Menu[]) =>
    items.map((item, index) => (
      <div
        key={index}
        onMouseEnter={(e) => handleMouseEnter(item, e)}
        onMouseLeave={handleMouseLeave}
        className="mb-1 mx-2"
      >
        <div
          className="d-flex align-items-center"
          style={{
            cursor: "pointer",
            padding: "10px 12px",
            borderRadius: "0 16px 16px 0",
            backgroundColor: activeMainMenu === item.label ? "rgba(0, 0, 0, 0.05)" : "transparent",
            color: activeMainMenu === item.label ? "#1a73e8" : "#3c4043",
            transition: "background-color 0.1s ease-in-out, color 0.1s ease-in-out",
            fontWeight: activeMainMenu === item.label ? 500 : 400,
            position: "relative",
            overflow: "hidden",
            fontSize: "14px",
            userSelect: "none",
          }}
          onClick={() => {
            if (!item.subMenu) {
              if (item.path) {
                navigate(`/${item.path}`);
                setActiveMainMenu(item.label);
              }
            }
          }}
        >
          <div className="me-2 d-flex align-items-center justify-content-center">
            <div
              title={item.label}
              style={{
                filter:
                  activeMainMenu === item.label
                    ? "invert(40%) sepia(91%) saturate(1683%) hue-rotate(202deg) brightness(100%) contrast(99%)"
                    : "none",
              }}
            >{item.icon}</div>
          </div>
          <span
            style={{
              opacity: show ? 1 : 0,
              width: show ? "auto" : 0,
              transition: "opacity 0.2s ease-in-out",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {item.label}
          </span>
          {item.subMenu && show && (
            <span
              className="ms-auto"
              style={{
                fontSize: "12px",
                color: "#5f6368",
                opacity: show ? 1 : 0,
                transition: "opacity 0.2s ease-in-out",
              }}
            >
              <FaChevronDown size={10} />
            </span>
          )}
        </div>
      </div>
    ));

  return (
    <>
      <div
        ref={sidebarRef}
        className="d-flex flex-column bg-white"
        style={{
          width: show ? "170px" : "60px",
          height: "100vh",
          position: "fixed",
          top: "0",
          left: "0",
          zIndex: "1000",
          overflow: "hidden",
          transition: "width 0.2s ease-in-out",
          borderRight: "1px solid #dadce0",
          boxShadow: show ? "rgba(0, 0, 0, 0.1) 0px 1px 3px" : "none",
        }}
      >
        <header
          className="d-flex align-items-center px-3 py-3"
          style={{
            cursor: "pointer",
            height: "64px",
          }}
          onClick={toggleSidebar}
        >
          <span
            className="mb-0 fs-3 fw-bold text-start"
            style={{
              fontFamily: "'Google Sans', sans-serif",
              color: "#5f6368",
              transition: "opacity 0.2s ease-in-out",
              opacity: show ? 1 : 0,
              width: show ? "auto" : 0,
              overflow: "hidden",
            }}
          >
            EU
          </span>
          <div
            className="d-flex justify-content-center align-items-center"
            style={{
              width: show ? "0" : "100%",
              opacity: show ? 0 : 1,
              overflow: "hidden",
              transition: "opacity 0.2s ease-in-out",
              color: "#5f6368",
              fontSize: "22px",
              fontWeight: "bold",
            }}
          >
            EU
          </div>
        </header>

        <div className="d-flex flex-column flex-grow-1" style={{ minHeight: 0 }}>
          <div>{renderMenuItems(topItems)}</div>

          <div style={{ flexGrow: 1, cursor: "pointer" }} onClick={toggleSidebar}></div>

          <div>{renderMenuItems(bottomItems)}</div>
        </div>
      </div>

      {hoverMenu && (
        <div
          ref={popupRef}
          className="bg-white"
          onMouseEnter={() => setHoverMenu(hoverMenu)}
          onMouseLeave={() => setHoverMenu(null)}
          style={{
            position: "fixed",
            top: `${hoverPosition.top}px`,
            left: `${hoverPosition.left}px`,
            borderRadius: "8px",
            zIndex: 1200,
            minWidth: "180px",
            boxShadow: "0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)",
            animation: "fadeIn 0.15s ease-in-out",
            transformOrigin: "top left",
            overflow: "visible",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "-8px",
              top: `${hoverItemHeight / 2 - 8}px`,
              width: "0",
              height: "0",
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderRight: "8px solid white",
              filter: "drop-shadow(-2px 0px 1px rgba(60,64,67,0.1))",
              zIndex: 1201,
            }}
          ></div>

          {sidebarItems
            .find((item) => item.label === hoverMenu)
            ?.subMenu?.map((subItem, index) => (
              <div
                key={index}
                className="d-flex align-items-center hover-bg-primary"
                style={{
                  cursor: "pointer",
                  padding: "12px 16px",
                  fontSize: "14px",
                  color: activeSubMenu === subItem.label ? "#1a73e8" : "#3c4043",
                  borderBottom:
                    index ===
                    (sidebarItems.find((item) => item.label === hoverMenu)?.subMenu?.length || 0) - 1
                      ? "none"
                      : "1px solid #f1f3f4",
                  transition: "background-color 0.1s ease-in-out",
                  fontWeight: activeSubMenu === subItem.label ? 500 : 400,
                  userSelect: "none",
                }}
                onClick={() => handleSubMenuItemClick(subItem)}
              >
                {subItem.icon && <span className="me-2">{subItem.icon}</span>}
                {subItem.label}
              </div>
            ))}
        </div>
      )}

      {show && window.innerWidth <= 768 && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 999,
          }}
          onClick={toggleSidebar}
        />
      )}

      {studentId && (
        <RaiseTicket show={showBugReport} onHide={() => setShowBugReport(false)} studentId={studentId} />
      )}

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          .hover-bg-primary:hover {
            background-color: #f1f3f4 !important;
          }
        `}
      </style>
    </>
  );
};

export default Sidebar;
