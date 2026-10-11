export const requireRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated user.',
        code: 'AUTH_REQUIRED',
      });
    }

    const userRole = req.user.role_id;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of the following roles: [${allowedRoles.join(', ')}]. You have role "${userRole}".`,
        code: 'AUTH_FORBIDDEN',
      });
    }

    next();
  };
};

export const requireAdmin = requireRoles(['admin']);
export const requireTechnicianOrAdmin = requireRoles(['admin', 'technician']);
export const requireStaffOrAdmin = requireRoles(['admin', 'staff']);
export const requireAnyRole = requireRoles(['admin', 'technician', 'staff']);
