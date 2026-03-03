"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tenantController_1 = require("../controllers/tenantController");
const auth_1 = require("../middleware/auth");
const roleGuard_1 = require("../middleware/roleGuard");
const router = express_1.default.Router();
router.post('/', auth_1.authMiddleware, (0, roleGuard_1.roleGuard)(['manage_tenants']), tenantController_1.createTenant);
router.get('/:tenantId', auth_1.authMiddleware, tenantController_1.getTenant);
router.patch('/:tenantId', auth_1.authMiddleware, (0, roleGuard_1.roleGuard)(['manage_tenants']), tenantController_1.updateTenant);
router.get('/:tenantId/invite-link', auth_1.authMiddleware, tenantController_1.generateInviteLink);
exports.default = router;
//# sourceMappingURL=tenantRoutes.js.map