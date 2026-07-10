import express from 'express';
import { UserController } from '../controllers/user.controller.js';
const {
  createUserValidator,
  updateUserValidator,
  updateUserStatusValidator,
  updateMembershipValidator,
  loginValidator
} = await import('../middlewares/validators/user.validator.js');
const {
  identifyUser,
  checkPermission
} = await import('../middlewares/security/index.js');

const router = express.Router({ mergeParams: true });
const ctrl = new UserController();

router.route('/login').post(loginValidator, ctrl.login);
router.route('/logout').post(identifyUser, ctrl.logout);

router
  .route('/')
  .get(identifyUser, checkPermission('read:user'), ctrl.getAll)
  .post(
    identifyUser,
    createUserValidator,
    checkPermission('create:user'),
    ctrl.create
  );

router
  .route('/active')
  .get(identifyUser, checkPermission('read:user'), ctrl.getActive);

router
  .route('/role/:role')
  .get(identifyUser, checkPermission('read:user'), ctrl.getByRole);

router
  .route('/:id')
  .get(identifyUser, checkPermission('read:user'), ctrl.getById)
  .put(
    identifyUser,
    checkPermission('update:user'),
    updateUserValidator,
    ctrl.update
  )
  .delete(identifyUser, checkPermission('delete:user'), ctrl.delete);

router
  .route('/:id/restore')
  .post(identifyUser, checkPermission('create:user'), ctrl.restore);

router
  .route('/:id/status')
  .put(
    identifyUser,
    checkPermission('update:user'),
    updateUserStatusValidator,
    ctrl.updateStatus
  );

router
  .route('/:id/membership')
  .put(
    identifyUser,
    checkPermission('update:user'),
    updateMembershipValidator,
    ctrl.updateMembership
  );

export default router;
