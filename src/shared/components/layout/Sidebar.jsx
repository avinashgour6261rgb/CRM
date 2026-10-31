<<<<<<< HEAD
import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
=======
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderGit2,
  ListTodo,
  CalendarCheck,
  Palmtree,
  DollarSign,
  Ticket,
  Calendar,
  MessageSquare,
  BellRing,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Award,
<<<<<<< HEAD
  CalendarCheck,
  Palmtree,
  UserCheck,
  Users,
  FolderGit2,
  ListTodo,
  Clock,
  ChevronLast,
  ChevronUp,
  Power,
  Edit,
} from "lucide-react";
import { useHR } from "../../../modules/hr/context/HRContext";
import { useAuth } from "../../context/AuthContext";
import { EmployeeDirectoryModal } from "../../../modules/hr/components/employees/EmployeeDirectoryModal";
import {
  getRoleConfig,
  canAccessModule,
  canManageProjects,
} from "../../utils/permissionUtils";
import { getCompanySettings } from "../../services/companySettingsService";
=======
  Zap,
  Clock,
  Layers,
  Users2,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHR } from '../../../modules/hr/context/HRContext';
import { useCRM } from '../../context/CRMContext';
import { canAccessModule, isLeaderOrAbove, canManageProjects } from '../../utils/permissionUtils';
import { getCompanySettings } from '../../services/companySettingsService';
import { EmployeeDirectoryModal } from '../../../modules/hr/components/employees/EmployeeDirectoryModal';
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
<<<<<<< HEAD
  const {
    currentUser: authUser,
    isAdmin,
    isHR,
    isTeamMember,
    isHRorAdmin,
    isLeaderOrAbove,
    roleConfig: authRoleConfig,
  } = useAuth();
=======
  const { currentUser: authUser } = useAuth();
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
  const { currentUser: hrUser } = useHR();
  const currentUser = authUser || hrUser;
  const { totalUnreadMessagesCount = 0 } = useCRM();

<<<<<<< HEAD
  // toggle profile
  const [isOpen, setisOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const profileRef = useRef(null);
  const popupRef = useRef(null);

  const handleProfilePosition = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.right,
      y: rect.top - 10,
    });

    setisOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        profileRef.current?.contains(e.target) ||
        popupRef.current?.contains(e.target)
      ) {
        return;
      }

      setisOpen(false);
    };

    document.addEventListener("click", handleOutsideClick);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  React.useEffect(() => {
    const handleUpdate = () => setCompanyInfo(getCompanySettings());
    window.addEventListener("company-settings-updated", handleUpdate);
    return () =>
      window.removeEventListener("company-settings-updated", handleUpdate);
  }, []);

  // Helper to determine active section from route
  const getSectionForPath = (pathname) => {
    if (["/leads", "/lead-contact"].some((path) => pathname.startsWith(path)))
      return "leads";
    if (
      [
        "/projects",
        "/tasks",
        "/timesheet",
        "/timesheets",
        "/timer",
        "/timelog",
        "/timelogs",
        "/work-timer",
        "/time-tracker",
        "/time",
        "/work",
      ].some((path) => pathname.startsWith(path))
    )
      return "work";
    if (
      [
        "/leaves",
        "/attendance",
        "/attendance-clock",
        "/clock",
        "/break",
        "/breaks",
        "/holiday",
        "/holidays",
        "/documents",
        "/documentation",
        "/appreciation",
        "/appreciations",
      ].some((path) => pathname.startsWith(path))
    )
      return "hr";
    if (
      ["/payroll", "/payslips", "/finance", "/expenses"].some((path) =>
        pathname.startsWith(path),
      )
    )
      return "finance";
    return null;
  };

  // Only one section dropdown can be open at a time (mutually exclusive accordion)
  const [openSection, setOpenSection] = useState(
    () => getSectionForPath(location.pathname) || null,
  );

  // Sync section with current route
  React.useEffect(() => {
    const routeSection = getSectionForPath(location.pathname);
    setOpenSection(routeSection || null);
  }, [location.pathname]);

  const toggleSection = (sectionKey) => {
    setOpenSection((prev) => (prev === sectionKey ? null : sectionKey));
  };

  const leadsExpanded = openSection === "leads";
  const workExpanded = openSection === "work";
  const hrExpanded = openSection === "hr";
  const financeExpanded = openSection === "finance";

  const isLeadsActive = ["/leads", "/lead-contact"].some((path) =>
    location.pathname.startsWith(path),
  );
=======
  const [companyInfo, setCompanyInfo] = useState(getCompanySettings());
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setCompanyInfo(getCompanySettings());
    };
    window.addEventListener('company-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('company-settings-updated', handleSettingsUpdate);
  }, []);

  const [leadsExpanded, setLeadsExpanded] = useState(false);
  const [hrExpanded, setHrExpanded] = useState(false);
  const [workExpanded, setWorkExpanded] = useState(false);
  const [financeExpanded, setFinanceExpanded] = useState(false);

  // Synchronize submenu expanded states based on active URL
  useEffect(() => {
    const p = location.pathname;
    if (p.startsWith('/lead')) setLeadsExpanded(true);
    if (p.startsWith('/leaves') || p.startsWith('/attendance') || p.startsWith('/holiday') || p.startsWith('/documents') || p.startsWith('/appreciation')) {
      setHrExpanded(true);
    }
    if (p.startsWith('/projects') || p.startsWith('/tasks') || p.startsWith('/timesheet')) {
      setWorkExpanded(true);
    }
    if (p.startsWith('/payroll') || p.startsWith('/expenses') || p.startsWith('/finance')) {
      setFinanceExpanded(true);
    }
  }, [location.pathname]);

  const toggleSection = (section) => {
    if (section === 'leads') setLeadsExpanded(!leadsExpanded);
    if (section === 'hr') setHrExpanded(!hrExpanded);
    if (section === 'work') setWorkExpanded(!workExpanded);
    if (section === 'finance') setFinanceExpanded(!financeExpanded);
  };

  const isHRorAdmin = currentUser?.role === 'HR' ||
    currentUser?.role === 'Super Admin' ||
    currentUser?.isAdmin ||
    currentUser?.systemRole === 'admin' ||
    currentUser?.systemRole === 'hr';

  const isLeadsActive = ['/leads', '/lead-contact'].some(path => location.pathname.startsWith(path));
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22

  const isHrActive = [
    "/leaves",
    "/attendance",
    "/attendance-clock",
    "/clock",
    "/break",
    "/breaks",
    "/holiday",
    "/holidays",
    "/documents",
    "/documentation",
    "/appreciation",
    "/appreciations",
  ].some((path) => location.pathname.startsWith(path));

  const isWorkActive = [
    "/projects",
    "/tasks",
    "/timesheet",
    "/timesheets",
    "/timer",
    "/timelog",
    "/timelogs",
    "/work-timer",
    "/time-tracker",
    "/time",
    "/work",
  ].some((path) => location.pathname.startsWith(path));

  const isFinanceActive = [
    "/payroll",
    "/payslips",
    "/finance",
    "/expenses",
  ].some((path) => location.pathname.startsWith(path));

  return (
<<<<<<< HEAD
    <aside
      style={{
        width: collapsed ? "72px" : "250px",
        backgroundColor: "#101b33",
        color: "#94a3b8",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        flexShrink: 0,
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        borderRight: "1px solid #1e293b",
        position: "sticky",
        top: 0,
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      {/* Brand & User Top Header */}
      <div
        style={{
          padding: collapsed ? "16px 8px" : "18px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: "70px",
        }}
        ref={profileRef}
        onClick={handleProfilePosition}
      >
        {!collapsed ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              overflow: "hidden",
              cursor: "pointer",
            }}
=======
    <aside className={`bg-[#101b33] text-slate-400 flex flex-col h-screen shrink-0 border-r border-slate-800 sticky top-0 z-[100] overflow-hidden transition-[width] duration-250 ease-out ${collapsed ? 'w-[72px]' : 'w-[250px]'}`}>
      {/* Brand & User Top Header */}
      <div className={`border-b border-white/6 flex items-center justify-between min-h-[70px] ${collapsed ? 'p-4 px-2' : 'py-4.5 px-5'}`}>
        {!collapsed ? (
          <div
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 overflow-hidden cursor-pointer"
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
            title="Click to open Profile Settings"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
<<<<<<< HEAD
                alt={currentUser.name || "User"}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  objectFit: "cover",
                  border: "2px solid rgba(59, 130, 246, 0.6)",
                  boxShadow: "0 4px 10px rgba(37,99,235,0.4)",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 4px 10px rgba(37,99,235,0.4)",
                  flexShrink: 0,
                }}
              >
                <Zap size={20} fill="#ffffff" />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: "800",
                    color: "#ffffff",
                    letterSpacing: "-0.01em",
                    maxWidth: "140px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {companyInfo.companyName ||
                    companyInfo.shortName ||
                    "Workspace"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "2px",
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 6px #10b981",
                  }}
                ></span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#cbd5e1",
                    fontWeight: "600",
                    maxWidth: "130px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentUser?.name || "Avinash"}
=======
                alt={currentUser.name || 'User'}
                className="w-9 h-9 rounded-[10px] object-cover border-2 border-blue-500/60 shadow-md shadow-blue-600/40 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-600/40 shrink-0">
                <Zap size={20} fill="#ffffff" />
              </div>
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[15px] font-extrabold text-white tracking-tight max-w-[140px] truncate">
                  {companyInfo.companyName || companyInfo.shortName || 'Workspace'}
                </span>
                <ChevronDown size={13} className="text-slate-400" />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                <span className="text-xs text-slate-300 font-semibold max-w-[130px] truncate">
                  {currentUser?.name || 'Avinash'}
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
                </span>
              </div>
            </div>
          </div>
        ) : (
<<<<<<< HEAD
          <div
            style={{
              width: "36px",
              height: "36px",
              margin: "0 auto",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
            }}
          >
=======
          <div className="w-9 h-9 mx-auto rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-600/40">
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
            <Zap size={20} fill="#ffffff" />
          </div>
        )}

        <div>
          <button>
            {isOpen ? (
              <span>
                {" "}
                <ChevronLeft size={30} color="#94a3b8" />
              </span>
            ) : (
              <span>
                {" "}
                <ChevronRight size={30} color="#94a3b8" />
              </span>
            )}
          </button>
        </div>
      </div>
      {/* isOpen */}
      {isOpen && (
        <div
          ref={popupRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: `${position.x}px`,
            top: `${position.y}px`,

            transform: "translate( 1rem ,3rem)",

            width: "20rem",
            height: "15rem",
            boxSizing: "border-box",
            background: "white",
            padding: "20px",
            color: "#111827",
            borderRadius: "12px ",
            boxShadow: "0 8px 30px rgba(0,0,0,0.20)",
            border: "0.2em solid #e5e7eb",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              justifyContent: "space-between",
              padding: "10px",
            }}
          >
            <div style={{ display: "flex", gap: "10px" }}>
              <img
                src={currentUser.avatar}
                alt={currentUser.name || "User"}
                style={{
                  width: "3rem",
                  height: "3rem",
                  objectFit: "cover",
                  border: "1px solid rgba(59, 130, 246, 0.6)",
                }}
              />
              {/* Profile name and role */}
              <div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: "800",
                      color: "black",
                      letterSpacing: "-0.01em",
                      maxWidth: "140px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {currentUser?.name || "Avinash"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "2px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      fontWeight: "600",
                      maxWidth: "130px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {"digital market"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/settings")}
              style={{
                color: "black",
                width: "20px",
                height: "20px",
              }}
            >
              <Edit />
            </button>
          </div>

          <div
            style={{
              borderBottom: "1px solid black",
            }}
          ></div>

          <div
            style={{
              padding: "10px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <h1>Dark</h1>
            <div
              style={{
                width: "40px",
                overflow: "hidden",
                display: "flex",
                justifyContent: `${true ? "flex-end" : "flex-start"}`,
                alignItems: "center",
                height: "20px",
                borderRadius: "10px",
                border: " 3px solid black",
                backgroundColor: "transprant",
              }}
            >
              <button
                style={{
                  display: "flex",
                  justifyContent: "center",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50px",
                  border: "2px solid black",
                  backgroundColor: "gray",
                }}
              >
                <span></span>
              </button>
            </div>
          </div>

          <div
            style={{
              padding: "10px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <h2 style={{ color: "#eb4034" }}> Logout</h2>
            <Power size={18} />
          </div>
        </div>
      )}

      {/* Navigation Links */}
<<<<<<< HEAD
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: collapsed ? "12px 6px" : "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
=======
      <div className={`flex-1 overflow-y-auto flex flex-col gap-1 ${collapsed ? 'py-3 px-1.5' : 'py-4 px-3'}`}>
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
        {/* Dashboard */}
        {canAccessModule(currentUser, "dashboard") && (
          <NavLink
            to="/dashboard"
<<<<<<< HEAD
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "8px",
              color: isActive ? "#ffffff" : "#94a3b8",
              backgroundColor: isActive
                ? "rgba(37, 99, 235, 0.18)"
                : "transparent",
              textDecoration: "none",
              fontSize: "13.5px",
              fontWeight: isActive ? "600" : "500",
              transition: "all 0.15s ease",
            })}
          >
            <LayoutDashboard
              size={18}
              color={location.pathname === "/dashboard" ? "#60a5fa" : "#94a3b8"}
            />
=======
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${isActive ? 'text-white bg-blue-600/20 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`
            }
          >
            <LayoutDashboard size={18} className={location.pathname === '/dashboard' ? 'text-blue-400' : 'text-slate-400'} />
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
            {!collapsed && <span>Dashboard</span>}
          </NavLink>
        )}

        {/* Employees & Role Management (Master Direct Access) */}
        {isHRorAdmin && (
          <NavLink
            to="/employees"
<<<<<<< HEAD
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "8px",
              color: isActive ? "#ffffff" : "#94a3b8",
              backgroundColor: isActive
                ? "rgba(37, 99, 235, 0.25)"
                : "transparent",
              textDecoration: "none",
              fontSize: "13.5px",
              fontWeight: isActive ? "700" : "500",
              transition: "all 0.15s ease",
            })}
          >
            <Users
              size={18}
              color={location.pathname === "/employees" ? "#60a5fa" : "#94a3b8"}
            />
            {!collapsed && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <span>Employees & Roles</span>
                <span
                  style={{
                    fontSize: "10px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    fontWeight: "700",
                  }}
                >
=======
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${isActive ? 'text-white bg-blue-600/25 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`
            }
          >
            <Users size={18} className={location.pathname === '/employees' ? 'text-blue-400' : 'text-slate-400'} />
            {!collapsed && (
              <div className="flex items-center justify-between w-full">
                <span>Employees & Roles</span>
                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
                  RBAC
                </span>
              </div>
            )}
          </NavLink>
        )}

        {/* Live Operations & Emergency Controls (Admin/HR) */}
        {isHRorAdmin && (
          <NavLink
            to="/team-operations"
<<<<<<< HEAD
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "8px",
              color: isActive ? "#ffffff" : "#94a3b8",
              backgroundColor: isActive
                ? "rgba(234, 88, 12, 0.22)"
                : "transparent",
              textDecoration: "none",
              fontSize: "13.5px",
              fontWeight: isActive ? "700" : "500",
              transition: "all 0.15s ease",
            })}
          >
            <Zap
              size={18}
              color={
                location.pathname === "/team-operations" ? "#fb923c" : "#f97316"
              }
              fill={
                location.pathname === "/team-operations" ? "#fb923c" : "none"
              }
            />
            {!collapsed && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <span>Live Operations</span>
                <span
                  style={{
                    fontSize: "10px",
                    backgroundColor: "#ea580c",
                    color: "#ffffff",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    fontWeight: "700",
                  }}
                >
=======
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${isActive ? 'text-white bg-orange-600/25 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`
            }
          >
            <Zap size={18} className={location.pathname === '/team-operations' ? 'text-orange-400' : 'text-orange-500'} fill={location.pathname === '/team-operations' ? '#fb923c' : 'none'} />
            {!collapsed && (
              <div className="flex items-center justify-between w-full">
                <span>Live Operations</span>
                <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded-full font-bold">
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
                  ADMIN
                </span>
              </div>
            )}
          </NavLink>
        )}

        {/* Leads - Core CRM Prospect & Deal Pipeline Section */}
<<<<<<< HEAD
        {canAccessModule(currentUser, "leads") && (
          <div>
            <div
              onClick={() => toggleSection("leads")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "8px",
                color: isLeadsActive ? "#ffffff" : "#94a3b8",
                backgroundColor: isLeadsActive
                  ? "rgba(37, 99, 235, 0.12)"
                  : "transparent",
                fontSize: "13.5px",
                fontWeight: isLeadsActive ? "600" : "500",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <Users2
                  size={18}
                  color={isLeadsActive ? "#3b82f6" : "#94a3b8"}
                />
                {!collapsed && <span>Leads</span>}
              </div>
              {!collapsed &&
                (leadsExpanded ? (
                  <ChevronDown size={14} color="#94a3b8" />
                ) : (
                  <ChevronRight size={14} color="#64748b" />
                ))}
            </div>

            {/* Submenu for Leads */}
            {leadsExpanded && (
              <div
                style={{
                  marginTop: "4px",
                  marginLeft: collapsed ? "0" : "16px",
                  paddingLeft: collapsed ? "0" : "12px",
                  borderLeft: collapsed
                    ? "none"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <NavLink
                  to="/lead-contact"
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    backgroundColor: isActive ? "#1d4ed8" : "transparent",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: isActive ? "600" : "400",
                    transition: "all 0.15s ease",
                  })}
                >
                  <UserCheck size={15} />
                  {!collapsed && <span>Lead Contact</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* HR - Dedicated Personnel & Attendance Section */}
        {(canAccessModule(currentUser, "leaves") ||
          canAccessModule(currentUser, "attendance")) && (
          <div>
            <div
              onClick={() => toggleSection("hr")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "8px",
                color: isHrActive ? "#ffffff" : "#94a3b8",
                backgroundColor: isHrActive
                  ? "rgba(37, 99, 235, 0.12)"
                  : "transparent",
                fontSize: "13.5px",
                fontWeight: isHrActive ? "600" : "500",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <Briefcase
                  size={18}
                  color={isHrActive ? "#3b82f6" : "#94a3b8"}
                />
                {!collapsed && <span>HR</span>}
              </div>
              {!collapsed &&
                (hrExpanded ? (
                  <ChevronDown size={14} color="#94a3b8" />
                ) : (
                  <ChevronRight size={14} color="#64748b" />
                ))}
=======
        {canAccessModule(currentUser, 'leads') && (
          <div>
            <div
              onClick={() => toggleSection('leads')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[13.5px] cursor-pointer transition-all duration-150 ${isLeadsActive ? 'text-white bg-blue-600/15 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
                }`}
            >
              <div className="flex items-center gap-3">
                <Users2 size={18} className={isLeadsActive ? 'text-blue-500' : 'text-slate-400'} />
                {!collapsed && <span>Leads</span>}
              </div>
              {!collapsed && (
                leadsExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-500" />
              )}
            </div>

            {/* Submenu for Leads */}
            {leadsExpanded && (
              <div className={`mt-1 flex flex-col gap-0.5 ${collapsed ? 'ml-0 pl-0 border-l-0' : 'ml-4 pl-3 border-l border-white/10'}`}>
                <NavLink
                  to="/lead-contact"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                    }`
                  }
                >
                  <UserCheck size={15} />
                  {!collapsed && <span>Lead Contact</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* HR - Dedicated Personnel & Attendance Section */}
        {(canAccessModule(currentUser, 'leaves') || canAccessModule(currentUser, 'attendance')) && (
          <div>
            <div
              onClick={() => toggleSection('hr')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[13.5px] cursor-pointer transition-all duration-150 ${isHrActive ? 'text-white bg-blue-600/15 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
                }`}
            >
              <div className="flex items-center gap-3">
                <Briefcase size={18} className={isHrActive ? 'text-blue-500' : 'text-slate-400'} />
                {!collapsed && <span>HR</span>}
              </div>
              {!collapsed && (
                hrExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-500" />
              )}
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
            </div>

            {/* Submenu for HR */}
            {hrExpanded && (
<<<<<<< HEAD
              <div
                style={{
                  marginTop: "4px",
                  marginLeft: collapsed ? "0" : "16px",
                  paddingLeft: collapsed ? "0" : "12px",
                  borderLeft: collapsed
                    ? "none"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {canAccessModule(currentUser, "leaves") && (
                  <NavLink
                    to="/leaves"
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      color: isActive ? "#ffffff" : "#94a3b8",
                      backgroundColor: isActive ? "#1d4ed8" : "transparent",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: isActive ? "600" : "400",
                      transition: "all 0.15s ease",
                    })}
=======
              <div className={`mt-1 flex flex-col gap-0.5 ${collapsed ? 'ml-0 pl-0 border-l-0' : 'ml-4 pl-3 border-l border-white/10'}`}>
                {canAccessModule(currentUser, 'leaves') && (
                  <NavLink
                    to="/leaves"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                      }`
                    }
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
                  >
                    <Palmtree size={15} />
                    {!collapsed && <span>Leaves</span>}
                  </NavLink>
                )}

<<<<<<< HEAD
                {canAccessModule(currentUser, "attendance") && (
                  <NavLink
                    to="/attendance"
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      color: isActive ? "#ffffff" : "#94a3b8",
                      backgroundColor: isActive ? "#1d4ed8" : "transparent",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: isActive ? "600" : "400",
                      transition: "all 0.15s ease",
                    })}
=======
                {canAccessModule(currentUser, 'attendance') && (
                  <NavLink
                    to="/attendance"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                      }`
                    }
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
                  >
                    <UserCheck size={15} />
                    {!collapsed && <span>Attendance</span>}
                  </NavLink>
                )}

                <NavLink
                  to="/holiday"
<<<<<<< HEAD
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    backgroundColor: isActive ? "#1d4ed8" : "transparent",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: isActive ? "600" : "400",
                    transition: "all 0.15s ease",
                  })}
=======
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                    }`
                  }
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
                >
                  <CalendarCheck size={15} />
                  {!collapsed && <span>Holiday</span>}
                </NavLink>

                <NavLink
                  to="/appreciation"
<<<<<<< HEAD
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    backgroundColor: isActive ? "#1d4ed8" : "transparent",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: isActive ? "600" : "400",
                    transition: "all 0.15s ease",
                  })}
=======
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                    }`
                  }
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
                >
                  <Award size={15} />
                  {!collapsed && <span>Appreciation</span>}
                </NavLink>

<<<<<<< HEAD
                {(isHRorAdmin ||
                  canAccessModule(currentUser, "documentation") ||
                  currentUser?.isDelegatedAdmin) && (
                  <NavLink
                    to="/documents"
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      color: isActive ? "#ffffff" : "#94a3b8",
                      backgroundColor: isActive ? "#1d4ed8" : "transparent",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: isActive ? "600" : "400",
                      transition: "all 0.15s ease",
                    })}
=======
                {(isHRorAdmin || canAccessModule(currentUser, 'documentation') || currentUser?.isDelegatedAdmin) && (
                  <NavLink
                    to="/documents"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                      }`
                    }
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
                  >
                    <FolderGit2 size={15} />
                    {!collapsed && <span>Documents & KYC</span>}
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        {/* Work - Core Daily Work Section */}
<<<<<<< HEAD
        {canAccessModule(currentUser, "tasks") && (
          <div>
            <div
              onClick={() => toggleSection("work")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "8px",
                color: isWorkActive ? "#ffffff" : "#94a3b8",
                backgroundColor: isWorkActive
                  ? "rgba(37, 99, 235, 0.12)"
                  : "transparent",
                fontSize: "13.5px",
                fontWeight: isWorkActive ? "600" : "500",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <Layers
                  size={18}
                  color={isWorkActive ? "#3b82f6" : "#94a3b8"}
                />
                {!collapsed && <span>Work</span>}
              </div>
              {!collapsed &&
                (workExpanded ? (
                  <ChevronDown size={14} color="#94a3b8" />
                ) : (
                  <ChevronRight size={14} color="#64748b" />
                ))}
=======
        {canAccessModule(currentUser, 'tasks') && (
          <div>
            <div
              onClick={() => toggleSection('work')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[13.5px] cursor-pointer transition-all duration-150 ${isWorkActive ? 'text-white bg-blue-600/15 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
                }`}
            >
              <div className="flex items-center gap-3">
                <Layers size={18} className={isWorkActive ? 'text-blue-500' : 'text-slate-400'} />
                {!collapsed && <span>Work</span>}
              </div>
              {!collapsed && (
                workExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-500" />
              )}
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
            </div>

            {/* Submenu for Work */}
            {workExpanded && (
<<<<<<< HEAD
              <div
                style={{
                  marginTop: "4px",
                  marginLeft: collapsed ? "0" : "16px",
                  paddingLeft: collapsed ? "0" : "12px",
                  borderLeft: collapsed
                    ? "none"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {(isLeaderOrAbove ||
                  canAccessModule(currentUser, "projects") ||
                  canManageProjects(currentUser)) && (
                  <NavLink
                    to="/projects"
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      color: isActive ? "#ffffff" : "#94a3b8",
                      backgroundColor: isActive ? "#1d4ed8" : "transparent",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: isActive ? "600" : "400",
                      transition: "all 0.15s ease",
                    })}
=======
              <div className={`mt-1 flex flex-col gap-0.5 ${collapsed ? 'ml-0 pl-0 border-l-0' : 'ml-4 pl-3 border-l border-white/10'}`}>
                {(isLeaderOrAbove || canAccessModule(currentUser, 'projects') || canManageProjects(currentUser)) && (
                  <NavLink
                    to="/projects"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                      }`
                    }
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
                  >
                    <FolderGit2 size={15} />
                    {!collapsed && <span>Projects</span>}
                  </NavLink>
                )}

                <NavLink
                  to="/tasks"
<<<<<<< HEAD
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    backgroundColor: isActive ? "#1d4ed8" : "transparent",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: isActive ? "600" : "400",
                    transition: "all 0.15s ease",
                  })}
=======
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                    }`
                  }
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
                >
                  <ListTodo size={15} />
                  {!collapsed && <span>Tasks</span>}
                </NavLink>

                <NavLink
                  to="/timesheet"
<<<<<<< HEAD
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    backgroundColor: isActive ? "#1d4ed8" : "transparent",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: isActive ? "600" : "400",
                    transition: "all 0.15s ease",
                  })}
=======
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                    }`
                  }
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
                >
                  <Clock size={15} />
                  {!collapsed && <span>Timesheet</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* Finance - Dedicated Financial Section (Admin / HR full access, employees only personal expenses) */}
<<<<<<< HEAD
        {(isHRorAdmin || canAccessModule(currentUser, "expenses")) && (
          <div>
            <div
              onClick={() => toggleSection("finance")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "8px",
                color: isFinanceActive ? "#ffffff" : "#94a3b8",
                backgroundColor: isFinanceActive
                  ? "rgba(37, 99, 235, 0.12)"
                  : "transparent",
                fontSize: "13.5px",
                fontWeight: isFinanceActive ? "600" : "500",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <DollarSign
                  size={18}
                  color={isFinanceActive ? "#3b82f6" : "#94a3b8"}
                />
                {!collapsed && <span>Finance</span>}
              </div>
              {!collapsed &&
                (financeExpanded ? (
                  <ChevronDown size={14} color="#94a3b8" />
                ) : (
                  <ChevronRight size={14} color="#64748b" />
                ))}
=======
        {(isHRorAdmin || canAccessModule(currentUser, 'expenses')) && (
          <div>
            <div
              onClick={() => toggleSection('finance')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[13.5px] cursor-pointer transition-all duration-150 ${isFinanceActive ? 'text-white bg-blue-600/15 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
                }`}
            >
              <div className="flex items-center gap-3">
                <DollarSign size={18} className={isFinanceActive ? 'text-blue-500' : 'text-slate-400'} />
                {!collapsed && <span>Finance</span>}
              </div>
              {!collapsed && (
                financeExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-500" />
              )}
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
            </div>

            {/* Submenu for Finance */}
            {financeExpanded && (
<<<<<<< HEAD
              <div
                style={{
                  marginTop: "4px",
                  marginLeft: collapsed ? "0" : "16px",
                  paddingLeft: collapsed ? "0" : "12px",
                  borderLeft: collapsed
                    ? "none"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <NavLink
                  to="/expenses"
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    backgroundColor: isActive ? "#1d4ed8" : "transparent",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: isActive ? "600" : "400",
                    transition: "all 0.15s ease",
                  })}
=======
              <div className={`mt-1 flex flex-col gap-0.5 ${collapsed ? 'ml-0 pl-0 border-l-0' : 'ml-4 pl-3 border-l border-white/10'}`}>
                <NavLink
                  to="/expenses"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                    }`
                  }
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
                >
                  <DollarSign size={15} />
                  {!collapsed && <span>Expenses</span>}
                </NavLink>

                {isHRorAdmin && (
                  <NavLink
                    to="/payroll"
<<<<<<< HEAD
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      color: isActive ? "#ffffff" : "#94a3b8",
                      backgroundColor: isActive ? "#1d4ed8" : "transparent",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: isActive ? "600" : "400",
                      transition: "all 0.15s ease",
                    })}
=======
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                      }`
                    }
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
                  >
                    <DollarSign size={15} />
                    {!collapsed && <span>Salary & Payslips</span>}
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

<<<<<<< HEAD
        {canAccessModule(currentUser, "tickets") && (
          <NavLink
            to="/tickets"
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "8px",
              color: isActive ? "#ffffff" : "#94a3b8",
              backgroundColor: isActive
                ? "rgba(37, 99, 235, 0.18)"
                : "transparent",
              textDecoration: "none",
              fontSize: "13.5px",
              fontWeight: isActive ? "600" : "500",
              transition: "all 0.15s ease",
            })}
          >
            <Ticket
              size={18}
              color={location.pathname === "/tickets" ? "#60a5fa" : "#94a3b8"}
            />
=======
        {canAccessModule(currentUser, 'tickets') && (
          <NavLink
            to="/tickets"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${isActive ? 'text-white bg-blue-600/20 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`
            }
          >
            <Ticket size={18} className={location.pathname === '/tickets' ? 'text-blue-400' : 'text-slate-400'} />
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
            {!collapsed && <span>Tickets</span>}
          </NavLink>
        )}

<<<<<<< HEAD
        {canAccessModule(currentUser, "events") && (
          <NavLink
            to="/events"
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "8px",
              color: isActive ? "#ffffff" : "#94a3b8",
              backgroundColor: isActive
                ? "rgba(37, 99, 235, 0.18)"
                : "transparent",
              textDecoration: "none",
              fontSize: "13.5px",
              fontWeight: isActive ? "600" : "500",
              transition: "all 0.15s ease",
            })}
          >
            <Calendar
              size={18}
              color={location.pathname === "/events" ? "#60a5fa" : "#94a3b8"}
            />
=======
        {canAccessModule(currentUser, 'events') && (
          <NavLink
            to="/events"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${isActive ? 'text-white bg-blue-600/20 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`
            }
          >
            <Calendar size={18} className={location.pathname === '/events' ? 'text-blue-400' : 'text-slate-400'} />
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
            {!collapsed && <span>Events</span>}
          </NavLink>
        )}

        <NavLink
          to="/messages"
<<<<<<< HEAD
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 12px",
            borderRadius: "8px",
            color: isActive ? "#ffffff" : "#94a3b8",
            backgroundColor: isActive
              ? "rgba(37, 99, 235, 0.18)"
              : "transparent",
            textDecoration: "none",
            fontSize: "13.5px",
            fontWeight: isActive ? "600" : "500",
            transition: "all 0.15s ease",
          })}
        >
          <MessageSquare
            size={18}
            color={location.pathname === "/messages" ? "#60a5fa" : "#94a3b8"}
          />
          {!collapsed && <span>Messages</span>}
=======
          className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${
              isActive ? 'text-white bg-blue-600/20 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <MessageSquare size={18} className={location.pathname === '/messages' ? 'text-blue-400' : 'text-slate-400'} />
              {totalUnreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-rose-600 rounded-full border-2 border-[#101b33] animate-pulse" />
              )}
            </div>
            {!collapsed && <span>Messages</span>}
          </div>
          {!collapsed && (
            totalUnreadMessagesCount > 0 ? (
              <span className="text-[10px] py-0.5 px-2 rounded-full bg-rose-600 text-white font-extrabold shadow-sm animate-pulse min-w-[20px] text-center">
                {totalUnreadMessagesCount > 99 ? '99+' : totalUnreadMessagesCount}
              </span>
            ) : (
              <span className="text-[10px] py-0.5 px-1.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                Chat
              </span>
            )
          )}
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
        </NavLink>

        <NavLink
          to="/notice-board"
<<<<<<< HEAD
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 12px",
            borderRadius: "8px",
            color: isActive ? "#ffffff" : "#94a3b8",
            backgroundColor: isActive
              ? "rgba(37, 99, 235, 0.18)"
              : "transparent",
            textDecoration: "none",
            fontSize: "13.5px",
            fontWeight: isActive ? "600" : "500",
            transition: "all 0.15s ease",
          })}
        >
          <BellRing
            size={18}
            color={
              location.pathname === "/notice-board" ? "#60a5fa" : "#94a3b8"
            }
          />
=======
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${isActive ? 'text-white bg-blue-600/20 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
            }`
          }
        >
          <BellRing size={18} className={location.pathname === '/notice-board' ? 'text-blue-400' : 'text-slate-400'} />
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
          {!collapsed && <span>Notice Board</span>}
        </NavLink>

        <NavLink
          to="/settings"
<<<<<<< HEAD
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 12px",
            borderRadius: "8px",
            color: isActive ? "#ffffff" : "#94a3b8",
            backgroundColor: isActive
              ? "rgba(37, 99, 235, 0.18)"
              : "transparent",
            textDecoration: "none",
            fontSize: "13.5px",
            fontWeight: isActive ? "600" : "500",
            transition: "all 0.15s ease",
          })}
        >
          <Settings
            size={18}
            color={location.pathname === "/settings" ? "#60a5fa" : "#94a3b8"}
          />
=======
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${isActive ? 'text-white bg-blue-600/20 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
            }`
          }
        >
          <Settings size={18} className={location.pathname === '/settings' ? 'text-blue-400' : 'text-slate-400'} />
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>

      {/* Sidebar Footer & Collapse Toggle */}
<<<<<<< HEAD
      <div
        style={{
          padding: collapsed ? "12px 8px" : "14px 18px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "12px",
          color: "#64748b",
        }}
      >
        {!collapsed && <span>v5.4.0</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px",
            borderRadius: "4px",
            margin: collapsed ? "0 auto" : "0",
          }}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
=======
      <div className={`border-t border-white/6 flex items-center justify-between text-xs text-slate-500 ${collapsed ? 'py-3 px-2' : 'py-3.5 px-4.5'}`}>
        {!collapsed && <span>v1.0.0</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`bg-transparent border-0 text-slate-400 hover:text-slate-200 cursor-pointer flex items-center justify-center p-1 rounded transition-colors ${collapsed ? 'mx-auto' : ''}`}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <EmployeeDirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
      />
    </aside>
  );
};
