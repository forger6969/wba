import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as attendanceService from './attendance.service.js';

/** POST /api/mentor/attendance/groups/:groupId — массовая отметка davomat на дату урока. */
export const markAttendance = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { lessonDate, records } = req.body;

  const rows = await attendanceService.markAttendance({
    mentorId: req.user.id,
    groupId,
    lessonDate,
    records,
  });

  res.json({ success: true, data: rows });
});

/** GET /api/mentor/attendance/groups/:groupId?date= | ?from=&to= */
export const getGroupAttendance = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { date, from, to } = req.query;

  const rows = await attendanceService.getGroupAttendance({
    mentorId: req.user.id,
    groupId,
    date,
    from,
    to,
  });

  res.json({ success: true, data: rows });
});
