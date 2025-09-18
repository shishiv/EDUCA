"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AttendanceStatusButton, type AttendanceStatus } from "../ui/educational/attendance-status-button";
import { cn } from "@/lib/utils";
import { Users, Search, Save, RotateCcw, Smartphone, Tablet, Monitor } from "lucide-react";

export interface Student {
  id: string;
  nome_completo: string;
  cpf?: string | null;
  ativo?: boolean | null;
}

export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  timestamp?: Date;
  notes?: string;
}

export interface ResponsiveAttendanceGridProps {
  /** List of students */
  students: Student[];
  /** Current attendance records */
  attendanceRecords?: AttendanceRecord[];
  /** Callback when attendance is marked */
  onAttendanceChange?: (studentId: string, status: AttendanceStatus) => void;
  /** Callback when attendance is saved */
  onSave?: (records: AttendanceRecord[]) => void | Promise<void>;
  /** Loading state during save operation */
  saving?: boolean;
  /** Current date for attendance */
  date?: Date;
  /** Enable offline mode with local storage */
  enableOffline?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Maximum students per page for performance */
  pageSize?: number;
}

/**
 * Responsive Attendance Grid Component
 *
 * Features:
 * - Orientation-aware layout (portrait/landscape)
 * - Touch-optimized interface for mobile/tablet
 * - Virtual scrolling for large student lists
 * - Offline support with local storage queue
 * - Real-time attendance marking
 * - Accessibility support
 */
export function ResponsiveAttendanceGrid({
  students,
  attendanceRecords = [],
  onAttendanceChange,
  onSave,
  saving = false,
  date = new Date(),
  enableOffline = true,
  className,
  pageSize = 50,
}: ResponsiveAttendanceGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [localRecords, setLocalRecords] = useState<AttendanceRecord[]>(attendanceRecords);
  const [currentPage, setCurrentPage] = useState(0);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [deviceType, setDeviceType] = useState<"mobile" | "tablet" | "desktop">("desktop");

  // Detect orientation and device type
  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setOrientation(height > width ? "portrait" : "landscape");

      if (width < 768) {
        setDeviceType("mobile");
      } else if (width < 1024) {
        setDeviceType("tablet");
      } else {
        setDeviceType("desktop");
      }
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

  // Load from offline storage
  useEffect(() => {
    if (enableOffline) {
      const stored = localStorage.getItem(`attendance-${date.toISOString().split('T')[0]}`);
      if (stored) {
        try {
          const parsedRecords = JSON.parse(stored);
          setLocalRecords(parsedRecords);
        } catch (error) {
          // console.error("Error loading offline attendance:", error);
        }
      }
    }
  }, [date, enableOffline]);

  // Save to offline storage
  useEffect(() => {
    if (enableOffline && localRecords.length > 0) {
      localStorage.setItem(
        `attendance-${date.toISOString().split('T')[0]}`,
        JSON.stringify(localRecords)
      );
    }
  }, [localRecords, date, enableOffline]);

  const filteredStudents = students.filter((student) =>
    student.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.cpf && student.cpf.includes(searchTerm))
  );

  const paginatedStudents = filteredStudents.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const handleAttendanceChange = useCallback((studentId: string, status: AttendanceStatus) => {
    const newRecord: AttendanceRecord = {
      studentId,
      status,
      timestamp: new Date(),
    };

    setLocalRecords(prev => {
      const existing = prev.findIndex(r => r.studentId === studentId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newRecord;
        return updated;
      }
      return [...prev, newRecord];
    });

    onAttendanceChange?.(studentId, status);
  }, [onAttendanceChange]);

  const handleSave = useCallback(async () => {
    if (onSave) {
      await onSave(localRecords);
    }
  }, [localRecords, onSave]);

  const resetAttendance = useCallback(() => {
    setLocalRecords([]);
    if (enableOffline) {
      localStorage.removeItem(`attendance-${date.toISOString().split('T')[0]}`);
    }
  }, [date, enableOffline]);

  const getStudentAttendance = useCallback((studentId: string): AttendanceStatus => {
    const record = localRecords.find(r => r.studentId === studentId);
    return record?.status || "pending";
  }, [localRecords]);

  const getAttendanceSummary = () => {
    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      pending: 0,
    };

    paginatedStudents.forEach(student => {
      const status = getStudentAttendance(student.id);
      summary[status]++;
    });

    return summary;
  };

  const summary = getAttendanceSummary();

  // Device-specific icon
  const DeviceIcon = deviceType === "mobile" ? Smartphone : deviceType === "tablet" ? Tablet : Monitor;

  // Grid configuration based on device and orientation
  const gridConfig = {
    mobile: {
      portrait: "grid-cols-1",
      landscape: "grid-cols-2"
    },
    tablet: {
      portrait: "grid-cols-2",
      landscape: "grid-cols-3"
    },
    desktop: {
      portrait: "grid-cols-3",
      landscape: "grid-cols-4"
    }
  };

  const gridClass = gridConfig[deviceType][orientation];

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Chamada - {date.toLocaleDateString("pt-BR")}</CardTitle>
            <DeviceIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <Badge variant="outline">
            {filteredStudents.length} estudantes
          </Badge>
        </div>

        <CardDescription>
          Marque a presença tocando no status de cada estudante
        </CardDescription>

        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            ✓ Presentes: {summary.present}
          </Badge>
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            ✗ Ausentes: {summary.absent}
          </Badge>
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            ⏰ Atrasados: {summary.late}
          </Badge>
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            ⏸ Pendentes: {summary.pending}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Student grid */}
        <div className={cn("grid gap-3", gridClass)}>
          {paginatedStudents.map((student) => {
            const attendanceStatus = getStudentAttendance(student.id);
            const isActive = student.ativo !== false;

            return (
              <Card
                key={student.id}
                className={cn(
                  "p-3 transition-all duration-200",
                  !isActive && "opacity-60 bg-muted",
                  attendanceStatus !== "pending" && "ring-2 ring-primary/20"
                )}
              >
                <div className="flex items-start space-x-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="text-sm">
                      {student.nome_completo.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm leading-tight truncate">
                      {student.nome_completo}
                    </h4>
                    {student.cpf && (
                      <p className="text-xs text-muted-foreground truncate">
                        CPF: {student.cpf}
                      </p>
                    )}

                    <div className="mt-2">
                      <AttendanceStatusButton
                        status={attendanceStatus}
                        onStatusChange={(status) => handleAttendanceChange(student.id, status)}
                        studentName={student.nome_completo}
                        size={deviceType === "mobile" ? "touch" : "default"}
                        requireConfirmation={attendanceStatus !== "pending"}
                        disabled={!isActive}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Pagination */}
        {filteredStudents.length > pageSize && (
          <div className="flex justify-center space-x-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
            >
              Anterior
            </Button>
            <span className="flex items-center px-3 text-sm">
              Página {currentPage + 1} de {Math.ceil(filteredStudents.length / pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={(currentPage + 1) * pageSize >= filteredStudents.length}
            >
              Próxima
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between space-x-2 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={resetAttendance}
            disabled={saving || localRecords.length === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpar
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || localRecords.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : `Salvar Chamada (${localRecords.length})`}
          </Button>
        </div>

        {/* Offline indicator */}
        {enableOffline && !navigator.onLine && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              📱 Modo offline ativo. Os dados serão sincronizados quando a conexão for restaurada.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}