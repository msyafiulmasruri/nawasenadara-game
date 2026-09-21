import { Router } from 'express';
import { authenticate, authorize } from '../../../middlewares/auth.js';
import {
  listStudents,
  getStudentDetail,
  listAlerts,
  getAlertDetail,
  acknowledgeAlert,
} from '../controllers/bk-controller.js';

const router = Router();

// Seluruh dashboard guru BK dibatasi role 'guru_bk' — data di sini
// (progres siswa, notifikasi risiko, isi jurnal/chat) sensitif dan
// TIDAK boleh diakses siswa maupun pihak lain.
router.use(authenticate, authorize('guru_bk'));

router.get('/students', listStudents);
router.get('/students/:id', getStudentDetail);
router.get('/alerts', listAlerts);
router.get('/alerts/:id', getAlertDetail);
router.post('/alerts/:id/acknowledge', acknowledgeAlert);

export default router;
