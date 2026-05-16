"use client";

import {
  Moon, Sun, Home, Compass, User, CreditCard, ChevronRight, Zap,
  Settings, HelpCircle, FileText, Database, Send,
  Bold, Italic, List, ListOrdered, Quote, Heading2, Heading3,
  ArrowLeft, Save, Sparkles, Plus, X, Check, ChevronDown, BookOpen,
  BarChart2, MessageSquare, Volume, Upload, AlertCircle, Radio, BookMarked, Mic, Wand2,
  Menu, LayoutTemplate, Activity, Layers, Search, Edit, Copy, Trash, Globe, Circle, Type, ChevronDownSquare, PieChart, DownloadCloud, BrainCircuit, Box, CheckCircle, Coins, ChartNoAxesCombined, SquarePen, BarChart3, Users, Tag, Gift, LogOut, Loader,
  Calendar, Inbox, Ticket, LayoutDashboard, EllipsisVertical, RefreshCw, Minimize2, ArrowRight, FileOutput, AlertTriangle, Eye, Wallet, ChevronLeft, Clock3, Pause, Play, XCircle, Download, UploadCloud, Pencil, Strikethrough, Undo, Redo, AlignLeft, AlignCenter, AlignRight, AlignJustify, Underline, Eraser, Highlighter, Subscript as SubscriptIcon, Superscript as SuperscriptIcon, Palette, Heart, MessageCircleMore,
  Key, Mail, Building, Camera, MessageCircle, Shield, ExternalLink, Smartphone
} from "lucide-react";

// Social Icons Fallbacks (Lucide removed brand icons)
const Facebook = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Instagram = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const Twitter = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const icons = {
  moon: Moon,
  sun: Sun,
  home: Home,
  compass: Compass,
  user: User,
  creditCard: CreditCard,
  chevronRight: ChevronRight,
  zap: Zap,
  coins: Coins,
  logout: LogOut,
  settings: Settings,
  help: HelpCircle,
  fileText: FileText,
  database: Database,
  send: Send,
  instagram: Instagram,
  twitter: Twitter,
  facebook: Facebook,
  // Editor toolbar
  bold: Bold,
  italic: Italic,
  strikethrough: Strikethrough,
  underline: Underline,
  list: List,
  listOrdered: ListOrdered,
  quote: Quote,
  heading2: Heading2,
  heading3: Heading3,
  undo: Undo,
  redo: Redo,
  alignLeft: AlignLeft,
  alignCenter: AlignCenter,
  alignRight: AlignRight,
  alignJustify: AlignJustify,
  clearFormat: Eraser,
  highlight: Highlighter,
  subscript: SubscriptIcon,
  superscript: SuperscriptIcon,
  palette: Palette,
  // Workspace & navigation
  arrowLeft: ArrowLeft,
  save: Save,
  sparkles: Sparkles,
  plus: Plus,
  x: X,
  moreVertical: EllipsisVertical,
  check: Check,
  chevronDown: ChevronDown,
  bookOpen: BookOpen,
  barChart: BarChart2,
  messageSquare: MessageSquare,
  upload: Upload,
  layoutDashboard: LayoutDashboard,
  alertCircle: AlertCircle,
  bookMarked: BookMarked,
  wand: Wand2,
  mic: Mic,
  radio: Radio,
  volume: Volume,
  menu: Menu,
  layoutTemplate: LayoutTemplate,
  copy: Copy,
  trash: Trash,
  circle: Circle,
  type: Type,
  chevronDownSquare: ChevronDownSquare,
  pieChart: PieChart,
  downloadCloud: DownloadCloud,
  brainCircuit: BrainCircuit,
  box: Box,
  checkCircle: CheckCircle,
  squarePen: SquarePen,
  chartNoAxesCombined: ChartNoAxesCombined,
  globe: Globe,
  search: Search,
  barChart3: BarChart3,
  users: Users,
  tag: Tag,
  gift: Gift,
  loader: Loader,
  edit: Edit,
  edit3: Pencil,
  activity: Activity,
  layers: Layers,
  calendar: Calendar,
  inbox: Inbox,
  ticket: Ticket,
  eye: Eye,
  chevronLeft: ChevronLeft,
  wallet: Wallet,
  alertTriangle: AlertTriangle,
  clock: Clock3,
  pause: Pause,
  play: Play,
  fileOutput: FileOutput,
  arrowRight: ArrowRight,
  xCircle: XCircle,
  download: Download,
  uploadCloud: UploadCloud,
  trash2: Trash,
  refreshCw: RefreshCw,
  minimize2: Minimize2,
  heart: Heart,
  messageCircleMore: MessageCircleMore,
  key: Key,
  mail: Mail,
  building: Building,
  camera: Camera,
  messageCircle: MessageCircle,
  smartphone: Smartphone,
  helpCircle: HelpCircle,
  shield: Shield,
  externalLink: ExternalLink,
};

export function PremiumIcon({ name, size = 24, className = "", ...rest }) {
  const IconComponent = icons[name];

  if (!IconComponent) {
    console.warn(`Icon '${name}' not found. Did you forget to import it in PremiumIcon.js?`);
    return null;
  }

  // Set a base opacity and stroke width for the premium look
  return <IconComponent size={size} strokeWidth={1.5} className={`premium-icon ${className}`} {...rest} />;
}
