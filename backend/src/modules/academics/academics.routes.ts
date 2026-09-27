import { Router } from 'express';
import sessionRoutes from './sessions/session.routes';
import classRoutes from './classes/class.routes';
import sectionRoutes from './sections/section.routes';
import subjectRoutes from './subjects/subject.routes';
import classSubjectRoutes from './class-subjects/classSubject.routes';
import sessionClassRoutes from './session-classes/sessionClass.routes';

const router = Router();

router.use('/sessions', sessionRoutes);
router.use('/classes', classRoutes);
router.use('/sections', sectionRoutes);
router.use('/subjects', subjectRoutes);
router.use('/class-subjects', classSubjectRoutes);
router.use('/session-classes', sessionClassRoutes);

export default router;
