"use client";

import {
  Moon, Sun, Home, Compass, User, CreditCard, ChevronRight, Zap,
  Settings, HelpCircle, FileText, Database, Send,
  Bold, Italic, List, ListOrdered, Quote, Heading2, Heading3,
  ArrowLeft, Save, Sparkles, Plus, X, Check, ChevronDown, BookOpen,
  BarChart2, MessageSquare, Volume, Upload, AlertCircle, Radio, BookMarked, Mic, Wand2,
  Menu, LayoutTemplate, Activity, Layers, Search, Edit, Copy, Trash, Globe, Circle, Type, ChevronDownSquare, PieChart, DownloadCloud, BrainCircuit, Box, CheckCircle, Coins, ChartNoAxesCombined, SquarePen, BarChart3, Users, Tag, Gift, LogOut, Loader,
  Calendar, Inbox, Ticket, MoreVertical, ArrowRight, FileOutput, AlertTriangle, Eye, Wallet, ChevronLeft, Clock3, Pause, Play, XCircle, Download, UploadCloud, Pencil
} from "lucide-react";

// Register all icons used in the app here
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
  // Editor toolbar
  bold: Bold,
  italic: Italic,
  list: List,
  listOrdered: ListOrdered,
  quote: Quote,
  heading2: Heading2,
  heading3: Heading3,
  // Workspace & navigation
  arrowLeft: ArrowLeft,
  save: Save,
  sparkles: Sparkles,
  plus: Plus,
  x: X,
  moreVertical: MoreVertical,
  check: Check,
  chevronDown: ChevronDown,
  bookOpen: BookOpen,
  barChart: BarChart2,
  messageSquare: MessageSquare,
  upload: Upload,
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
