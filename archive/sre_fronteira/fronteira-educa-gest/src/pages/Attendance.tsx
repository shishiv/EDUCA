import MainLayout from '@/components/Layout/MainLayout';
import { AttendanceTable } from '@/components/attendance/AttendanceTable';

const Attendance = () => {
  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Chamada de Presença</h1>
        <AttendanceTable />
      </div>
    </MainLayout>
  );
};

export default Attendance;
