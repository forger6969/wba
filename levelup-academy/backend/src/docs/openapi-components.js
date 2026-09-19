/**
 * Shared OpenAPI 3.0 components (schemas / responses / parameters / security
 * schemes) referenced via $ref from the @openapi JSDoc blocks scattered across
 * backend/src/modules/*.routes.js. This file is pure data (no JSDoc parsing
 * needed) — swagger-jsdoc merges it in via the `definition` option in
 * backend/src/config/swagger.js.
 *
 * Field shapes here are taken directly from the corresponding *.service.js /
 * *.repository.js mapping functions — not guessed. Where a service returns a
 * raw DB row without remapping to camelCase, the schema below reflects the
 * raw snake_case column names actually sent over the wire.
 */

export const components = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description:
        "Access token from /api/auth/{main,staff,member}/login or /google or /refresh. " +
        "Payload: { sub, role, orgId, branchId }. Sent as 'Authorization: Bearer <token>'.",
    },
  },

  parameters: {
    IdParam: {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
    PageParam: {
      name: 'page',
      in: 'query',
      schema: { type: 'integer', minimum: 1, default: 1 },
    },
    LimitParam: {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },

  responses: {
    Unauthorized: {
      description: 'Missing/invalid/expired bearer token',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
    Forbidden: {
      description: 'Authenticated but role not allowed on this endpoint',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
    ValidationError: {
      description: 'zod validation failed (body/params/query)',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } },
    },
    NotFound: {
      description: 'Resource not found (or not in caller\'s organization/scope)',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
    Conflict: {
      description: 'Conflict with current state (e.g. already fired / not fired)',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
    NotImplemented: {
      description:
        'Endpoint is a stub — the feature has no DB table/migration yet. ' +
        'The route exists so the front-end can render, but it always fails. Do not wire UI to it.',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
  },

  schemas: {
    // ---------- generic envelopes ----------
    ErrorResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string' },
        details: { type: 'object', nullable: true },
        stack: { type: 'string', nullable: true, description: 'Only present when NODE_ENV=development' },
      },
      required: ['success', 'message'],
    },
    ValidationErrorResponse: {
      allOf: [
        { $ref: '#/components/schemas/ErrorResponse' },
        {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Validation failed' },
            details: {
              type: 'object',
              description: 'zod .flatten().fieldErrors — map of field name to array of error messages',
              additionalProperties: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      ],
    },
    MessageResponse: {
      type: 'object',
      properties: { message: { type: 'string' } },
    },
    PageMeta: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        page: { type: 'integer' },
        limit: { type: 'integer' },
        totalPages: { type: 'integer' },
      },
    },

    // ---------- auth ----------
    LoginRequest: {
      type: 'object',
      required: ['login', 'password'],
      properties: {
        login: { type: 'string', description: 'Email (staff/main_admin) or 8-char login code (student/parent)' },
        password: { type: 'string' },
      },
    },
    GoogleLoginRequest: {
      type: 'object',
      required: ['idToken'],
      properties: { idToken: { type: 'string', description: 'Google/Firebase id-token from the client SDK' } },
    },
    ForgotPasswordRequest: {
      type: 'object',
      required: ['email'],
      properties: { email: { type: 'string', format: 'email' } },
    },
    ResetPasswordRequest: {
      type: 'object',
      required: ['email', 'otp', 'newPassword'],
      properties: {
        email: { type: 'string', format: 'email' },
        otp: { type: 'string', pattern: '^\\d{6}$' },
        newPassword: { type: 'string', minLength: 8 },
      },
    },
    AuthUser: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        role: {
          type: 'string',
          enum: ['main_admin', 'ceo', 'admin', 'mentor', 'student', 'parent', 'methodist'],
        },
        organizationId: { type: 'string', format: 'uuid', nullable: true },
        branchId: { type: 'string', format: 'uuid', nullable: true },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
      },
    },
    AuthResponse: {
      type: 'object',
      description: 'Also sets a `refresh_token` httpOnly cookie (path /api/auth, 30 days) alongside this body.',
      properties: {
        user: { $ref: '#/components/schemas/AuthUser' },
        accessToken: { type: 'string', description: 'JWT, 15 min TTL' },
      },
    },

    // ---------- main admin / leads ----------
    LeadSubmitRequest: {
      type: 'object',
      required: ['name', 'phone'],
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 120 },
        phone: { type: 'string' },
        centerName: { type: 'string', maxLength: 160 },
        centerSize: { type: 'string', maxLength: 60 },
        message: { type: 'string', maxLength: 2000 },
      },
    },
    Lead: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        phone: { type: 'string' },
        centerName: { type: 'string', nullable: true },
        centerSize: { type: 'string', nullable: true },
        message: { type: 'string', nullable: true },
        status: { type: 'string', enum: ['new', 'contacted', 'onboarded', 'rejected'] },
        notes: { type: 'string', nullable: true },
        organizationId: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    LeadUpdateRequest: {
      type: 'object',
      description: 'Partial — at least one field required',
      properties: {
        status: { type: 'string', enum: ['new', 'contacted', 'onboarded', 'rejected'] },
        notes: { type: 'string', maxLength: 2000 },
      },
    },
    OnboardPartnerRequest: {
      type: 'object',
      required: ['organizationName', 'admin'],
      properties: {
        organizationName: { type: 'string', minLength: 2, maxLength: 160 },
        domain: { type: 'string', example: 'marsit-school.us' },
        leadId: { type: 'string', format: 'uuid' },
        admin: {
          type: 'object',
          required: ['firstName', 'lastName', 'email'],
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
          },
        },
      },
    },
    Organization: {
      type: 'object',
      description:
        'Partner organization profile (CEO → Settings). `plan` is derived at read time ' +
        'from the org tier via config/plans.js — it is not a stored column.',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        domain: { type: 'string', nullable: true, example: 'levelup' },
        status: { type: 'string', example: 'active' },
        lessonDurationMin: {
          type: 'integer',
          nullable: true,
          description:
            'Lesson length in minutes, applied to every group of the org. Group end time is ' +
            'computed from it on the backend.',
          example: 90,
        },
        createdAt: { type: 'string', format: 'date-time' },
        plan: {
          type: 'object',
          properties: {
            branchLimit: { type: 'integer', nullable: true },
            diskSpace: { type: 'string', example: '500 ГБ' },
          },
        },
      },
    },
    UpdateOrganizationRequest: {
      type: 'object',
      description: 'Partial — at least one field required.',
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 160 },
        domain: {
          type: 'string',
          nullable: true,
          description: 'Lowercased. Empty string or null clears it. Must be unique (409 otherwise).',
        },
        lessonDurationMin: { type: 'integer', minimum: 10, maximum: 600 },
      },
    },
    PlatformAnnouncement: {
      type: 'object',
      description:
        'Announcement sent by the platform owner to partners. Distinct from the ' +
        'organization-level announcement (/api/super/announcements): audience here is ' +
        'the partner centres themselves, not the staff of one centre. Not pushed to the ' +
        'notification queue — recipients are staff and only student/parent accounts are ' +
        'linked to the Telegram bot.',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        body: { type: 'string' },
        targetType: { type: 'string', enum: ['all-partners', 'all-ceo'] },
        recipientCount: {
          type: 'integer',
          description: 'Counted at send time and frozen — the audience changes later.',
        },
        readCount: {
          type: 'integer',
          description: 'Always 0 — read receipts do not exist in the system yet.',
        },
        senderName: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    MainProfile: {
      type: 'object',
      description: 'Profile of the platform owner (main_admin).',
      properties: {
        id: { type: 'string', format: 'uuid' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email', nullable: true },
        phone: { type: 'string', nullable: true },
        role: { type: 'string', example: 'main_admin' },
      },
    },
    PlatformPenalty: {
      type: 'object',
      description:
        'Staff penalty seen from the platform level. READ-ONLY for main_admin: by the ' +
        'CAN_ISSUE matrix the platform owner issues penalties to nobody — they are issued ' +
        'by CEO and Admin inside their own organization.',
      properties: {
        id: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: ['sariq', 'qizil', 'qora'] },
        amount: {
          type: 'number',
          nullable: true,
          description: 'UZS. Optional add-on for any level, not tied to a specific type.',
        },
        reason: { type: 'string' },
        partnerName: { type: 'string', nullable: true },
        employeeName: { type: 'string' },
        employeeRole: { type: 'string' },
        issuerName: { type: 'string', nullable: true },
        issuerRole: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    PlatformPricing: {
      type: 'object',
      description:
        'Student-bucket tiers (model changed 2026-07-16). Branches are free — the old ' +
        'baseFirstBranch/perExtraBranch/perStudent fields NO LONGER EXIST. ' +
        'Price is a flat fee decided by the total active account count (students, parents and staff). Source: config/plans.js.',
      properties: {
        tiers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'standard' },
              label: { type: 'string', example: 'Standard' },
              minStudents: { type: 'integer', example: 101 },
              maxStudents: {
                type: 'integer',
                nullable: true,
                description: 'null = no upper bound (Network tier)',
                example: 300,
              },
              price: {
                type: 'integer',
                nullable: true,
                description: 'UZS/month. null = negotiated individually (Network tier)',
                example: 349000,
              },
            },
          },
        },
        currency: { type: 'string', example: 'UZS' },
      },
    },
    UpdatePricingRequest: {
      type: 'object',
      description:
        'DEPRECATED — tiers are hard-coded in config/plans.js, so PUT is a no-op that simply ' +
        'echoes the current tiers back. Making them DB-editable is a v2 task.',
      properties: {},
    },
    PartnerSummary: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        plan: { type: 'string', nullable: true },
        domain: { type: 'string', nullable: true },
        status: { type: 'string', enum: ['active', 'frozen'] },
        createdAt: { type: 'string', format: 'date-time' },
        branches: { type: 'integer' },
        students: { type: 'integer' },
        monthlyBill: { type: 'number' },
      },
    },

    // ---------- super admin ----------
    Branch: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        address: { type: 'string', nullable: true },
        phone: { type: 'string', nullable: true },
        isMain: { type: 'boolean' },
        isArchived: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    CreateBranchRequest: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 120 },
        address: { type: 'string', maxLength: 500 },
        phone: { type: 'string' },
      },
    },
    UpdateBranchRequest: {
      type: 'object',
      description: 'Partial — at least one field required',
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 120 },
        address: { type: 'string', maxLength: 500 },
        phone: { type: 'string' },
      },
    },
    AdminSummary: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        status: { type: 'string', enum: ['active', 'frozen'] },
        branchId: { type: 'string', format: 'uuid' },
      },
    },
    CreateAdminRequest: {
      type: 'object',
      required: ['firstName', 'lastName', 'email', 'branchId'],
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        branchId: { type: 'string', format: 'uuid' },
        phone: { type: 'string' },
      },
    },
    UpdateAdminRequest: {
      type: 'object',
      description: 'Partial — at least one field required',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        branchId: { type: 'string', format: 'uuid' },
        phone: { type: 'string' },
      },
    },
    MethodistSummary: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        status: { type: 'string', enum: ['active', 'frozen'] },
        phone: { type: 'string', nullable: true },
      },
    },
    CreateMethodistRequest: {
      type: 'object',
      required: ['firstName', 'lastName', 'email'],
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
      },
    },
    UpdateMethodistRequest: {
      type: 'object',
      description: 'Partial — at least one field required',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string' },
      },
    },

    // ---------- admin: expenses/students/mentors/groups ----------
    Expense: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        category: { type: 'string' },
        amount: { type: 'number' },
        spentAt: { type: 'string', format: 'date-time', nullable: true },
        note: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    CreateExpenseRequest: {
      type: 'object',
      required: ['category', 'amount'],
      properties: {
        category: { type: 'string', maxLength: 60 },
        amount: { type: 'number', exclusiveMinimum: 0, maximum: 9999999999 },
        spentAt: { type: 'string', format: 'date-time' },
        note: { type: 'string', maxLength: 1000 },
      },
    },
    CreateStudentRequest: {
      type: 'object',
      required: ['firstName', 'lastName', 'phone'],
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string' },
        birthDate: { type: 'string', format: 'date' },
        groupId: { type: 'string', format: 'uuid' },
        parent: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
          },
        },
      },
    },
    UpdateStudentRequest: {
      type: 'object',
      description: 'Partial — at least one field required',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string' },
        birthDate: { type: 'string', format: 'date' },
      },
    },
    StudentListItem: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string' },
        status: { type: 'string' },
        loginCode: { type: 'string' },
        coinBalance: { type: 'integer' },
        totalDebt: { type: 'number' },
        hasOverdueInvoice: { type: 'boolean' },
        hasParent: { type: 'boolean' },
        groups: { type: 'array', items: { type: 'object' } },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    StudentDetail: {
      allOf: [
        { $ref: '#/components/schemas/StudentListItem' },
        {
          type: 'object',
          properties: {
            birthDate: { type: 'string', format: 'date', nullable: true },
            frozenAt: { type: 'string', format: 'date-time', nullable: true },
            frozenReason: { type: 'string', nullable: true },
            groups: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  subject: { type: 'string' },
                  monthlyPrice: { type: 'number' },
                  mentor: { type: 'string' },
                },
              },
            },
          },
        },
      ],
    },
    MentorSummary: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string', nullable: true },
        status: { type: 'string' },
      },
    },
    CreateMentorRequest: {
      type: 'object',
      required: ['firstName', 'lastName', 'email', 'password'],
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8, maxLength: 128 },
        phone: { type: 'string' },
      },
    },
    UpdateMentorRequest: {
      type: 'object',
      description: 'Partial — at least one field required',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string' },
      },
    },
    Group: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        subject: { type: 'string' },
        monthlyPrice: { type: 'number' },
        schedule: {
          type: 'array',
          nullable: true,
          items: {
            type: 'object',
            properties: {
              day: { type: 'string', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
              start: { type: 'string', example: '18:00' },
              end: { type: 'string', example: '19:30' },
            },
          },
        },
        room: { type: 'string', nullable: true },
        isArchived: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    CreateGroupRequest: {
      type: 'object',
      required: ['name', 'subject', 'mentorId', 'monthlyPrice'],
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 120 },
        subject: { type: 'string', minLength: 1, maxLength: 120 },
        mentorId: { type: 'string', format: 'uuid' },
        monthlyPrice: { type: 'number', minimum: 0 },
        schedule: {
          type: 'array',
          maxItems: 14,
          items: {
            type: 'object',
            properties: {
              day: { type: 'string', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
              start: { type: 'string' },
              end: { type: 'string' },
            },
          },
        },
        room: { type: 'string', maxLength: 60 },
      },
    },
    UpdateGroupRequest: {
      type: 'object',
      description: 'Partial — at least one field required',
      properties: {
        name: { type: 'string' },
        subject: { type: 'string' },
        mentorId: { type: 'string', format: 'uuid' },
        monthlyPrice: { type: 'number' },
        schedule: { type: 'array', items: { type: 'object' } },
        room: { type: 'string' },
      },
    },

    // ---------- admin payments ----------
    Invoice: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: ['full', 'split'] },
        status: { type: 'string', enum: ['pending', 'partially_paid', 'paid', 'overdue', 'cancelled'] },
        totalAmount: { type: 'number' },
        paidAmount: { type: 'number' },
        dueDate: { type: 'string', format: 'date', nullable: true },
        periodMonth: { type: 'string', format: 'date', nullable: true },
        comment: { type: 'string', nullable: true },
        source: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    Transaction: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        invoiceId: { type: 'string', format: 'uuid' },
        method: { type: 'string', enum: ['cash', 'card', 'transfer'] },
        status: { type: 'string', enum: ['completed', 'refunded', 'voided'] },
        amount: { type: 'number' },
        receiptKey: { type: 'string', nullable: true },
        splitBatchId: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    CreateAdHocPaymentRequest: {
      type: 'object',
      required: ['studentId', 'totalAmount', 'parts'],
      description: 'Sum of parts[].amount must equal totalAmount (within 0.005 tolerance)',
      properties: {
        studentId: { type: 'string', format: 'uuid' },
        groupId: { type: 'string', format: 'uuid' },
        periodMonth: { type: 'string', format: 'date' },
        totalAmount: { type: 'number', exclusiveMinimum: 0 },
        parts: {
          type: 'array',
          minItems: 1,
          maxItems: 5,
          items: {
            type: 'object',
            required: ['method', 'amount'],
            properties: {
              method: { type: 'string', enum: ['cash', 'card', 'transfer'] },
              amount: { type: 'number', exclusiveMinimum: 0 },
            },
          },
        },
        comment: { type: 'string', maxLength: 1000 },
      },
    },
    PayInvoiceRequest: {
      type: 'object',
      required: ['parts'],
      properties: {
        parts: {
          type: 'array',
          minItems: 1,
          maxItems: 5,
          items: {
            type: 'object',
            required: ['method', 'amount'],
            properties: {
              method: { type: 'string', enum: ['cash', 'card', 'transfer'] },
              amount: { type: 'number', exclusiveMinimum: 0 },
            },
          },
        },
      },
    },

    // ---------- mentor: attendance/homework/tests/salary/coins ----------
    AttendanceRecord: {
      type: 'object',
      description: 'Raw `attendance` table row (RETURNING *) — not remapped to camelCase.',
      properties: {
        id: { type: 'string', format: 'uuid' },
        branch_id: { type: 'string', format: 'uuid' },
        group_id: { type: 'string', format: 'uuid' },
        student_id: { type: 'string', format: 'uuid' },
        lesson_date: { type: 'string', format: 'date' },
        status: { type: 'string', enum: ['present', 'absent', 'late', 'excused'] },
        marked_by: { type: 'string', format: 'uuid' },
        comment: { type: 'string', nullable: true },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    },
    MarkAttendanceRequest: {
      type: 'object',
      required: ['lessonDate', 'records'],
      properties: {
        lessonDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        records: {
          type: 'array',
          minItems: 1,
          description: 'studentId must be unique within the array',
          items: {
            type: 'object',
            required: ['studentId', 'status'],
            properties: {
              studentId: { type: 'string', format: 'uuid' },
              status: { type: 'string', enum: ['present', 'absent', 'late', 'excused'] },
              comment: { type: 'string', maxLength: 500 },
            },
          },
        },
      },
    },
    Homework: {
      type: 'object',
      description: 'Raw `homework` table row (RETURNING *) — not remapped to camelCase.',
      properties: {
        id: { type: 'string', format: 'uuid' },
        branch_id: { type: 'string', format: 'uuid' },
        group_id: { type: 'string', format: 'uuid' },
        created_by: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        attachment_key: { type: 'string', nullable: true },
        max_score: { type: 'integer' },
        coin_reward: { type: 'integer' },
        deadline: { type: 'string', format: 'date-time' },
        is_archived: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
    CreateHomeworkRequest: {
      type: 'object',
      required: ['title', 'deadline'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 4000 },
        attachmentKey: { type: 'string', maxLength: 512 },
        maxScore: { type: 'integer', minimum: 1, default: 100 },
        coinReward: { type: 'integer', minimum: 0, default: 0 },
        deadline: { type: 'string', format: 'date-time' },
      },
    },
    HomeworkSubmission: {
      type: 'object',
      description: 'Raw `homework_submissions` table row (RETURNING *) — not remapped to camelCase.',
      properties: {
        id: { type: 'string', format: 'uuid' },
        homework_id: { type: 'string', format: 'uuid' },
        student_id: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: ['submitted', 'late', 'graded'] },
        file_key: { type: 'string', nullable: true },
        text_answer: { type: 'string', nullable: true },
        score: { type: 'integer', nullable: true },
        submitted_at: { type: 'string', format: 'date-time' },
        graded_by: { type: 'string', format: 'uuid', nullable: true },
        graded_at: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    Test: {
      type: 'object',
      description: 'Raw `tests` table row (RETURNING *) — includes `correct` answer indices (mentor-only view).',
      properties: {
        id: { type: 'string', format: 'uuid' },
        branch_id: { type: 'string', format: 'uuid' },
        group_id: { type: 'string', format: 'uuid' },
        created_by: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              q: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              correct: { type: 'integer', description: 'Index of the correct option' },
            },
          },
        },
        duration_min: { type: 'integer' },
        starts_at: { type: 'string', format: 'date-time', nullable: true },
        ends_at: { type: 'string', format: 'date-time', nullable: true },
        coin_reward: { type: 'integer' },
        is_archived: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
    TestForStudent: {
      allOf: [
        { $ref: '#/components/schemas/Test' },
        {
          type: 'object',
          description: 'Same shape, but `questions[].correct` is stripped before being sent to students.',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  q: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      ],
    },
    CreateTestRequest: {
      type: 'object',
      required: ['title', 'questions', 'durationMin'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        questions: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['q', 'options', 'correct'],
            properties: {
              q: { type: 'string', maxLength: 1000 },
              options: { type: 'array', minItems: 2, items: { type: 'string', maxLength: 300 } },
              correct: { type: 'integer', minimum: 0, description: 'Must be a valid index within options' },
            },
          },
        },
        durationMin: { type: 'integer', exclusiveMinimum: 0 },
        startsAt: { type: 'string', format: 'date-time' },
        endsAt: { type: 'string', format: 'date-time', description: 'Must be after startsAt if both given' },
        coinReward: { type: 'integer', minimum: 0, default: 0 },
      },
    },
    TestResult: {
      type: 'object',
      description: 'Raw `test_results` row shape from listResultsForTest',
      properties: {
        id: { type: 'string', format: 'uuid' },
        test_id: { type: 'string', format: 'uuid' },
        student_id: { type: 'string', format: 'uuid' },
        started_at: { type: 'string', format: 'date-time', nullable: true },
        finished_at: { type: 'string', format: 'date-time', nullable: true },
        answers: { type: 'array', items: { type: 'integer' }, nullable: true },
        score: { type: 'integer', nullable: true },
      },
    },
    SalaryRecord: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        organization_id: { type: 'string', format: 'uuid' },
        branch_id: { type: 'string', format: 'uuid' },
        mentor_id: { type: 'string', format: 'uuid' },
        period_month: { type: 'string', format: 'date' },
        base_amount: { type: 'number' },
        bonus_amount: { type: 'number' },
        status: { type: 'string', enum: ['draft', 'approved', 'paid'] },
        note: { type: 'string', nullable: true },
        paid_at: { type: 'string', format: 'date-time', nullable: true },
        created_by: { type: 'string', format: 'uuid' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
    UpsertSalaryRequest: {
      type: 'object',
      required: ['mentorId', 'periodMonth', 'baseAmount'],
      properties: {
        mentorId: { type: 'string', format: 'uuid' },
        periodMonth: { type: 'string', example: '2026-07', description: 'YYYY-MM or YYYY-MM-DD, normalized to the 1st of the month' },
        baseAmount: { type: 'number', minimum: 0 },
        bonusAmount: { type: 'number', minimum: 0, default: 0 },
        note: { type: 'string', maxLength: 2000 },
      },
    },
    GrantCoinsRequest: {
      type: 'object',
      required: ['studentId', 'amount', 'reason'],
      properties: {
        studentId: { type: 'string', format: 'uuid' },
        amount: { type: 'integer', description: 'Non-zero; positive = reward, negative = deduction' },
        reason: { type: 'string', minLength: 1, maxLength: 200 },
      },
    },
    CoinHistoryEntry: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        branch_id: { type: 'string', format: 'uuid' },
        student_id: { type: 'string', format: 'uuid' },
        actor_id: { type: 'string', format: 'uuid', nullable: true },
        operation: { type: 'string', enum: ['reward', 'deduction', 'purchase', 'system'] },
        amount: { type: 'integer' },
        balance_after: { type: 'integer' },
        reason: { type: 'string' },
        ref_type: { type: 'string', nullable: true },
        ref_id: { type: 'string', nullable: true },
        created_at: { type: 'string', format: 'date-time' },
      },
    },

    // ---------- student: shop / leaderboard ----------
    ShopItem: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        branch_id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        image_key: { type: 'string', nullable: true },
        coin_price: { type: 'integer' },
        stock: { type: 'integer' },
        is_archived: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
    CreateShopItemRequest: {
      type: 'object',
      required: ['name', 'coinPrice', 'stock'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 160 },
        imageKey: { type: 'string', maxLength: 512 },
        coinPrice: { type: 'integer', exclusiveMinimum: 0 },
        stock: { type: 'integer', minimum: 0 },
      },
    },
    UpdateShopItemRequest: {
      type: 'object',
      description: 'Partial — at least one field required',
      properties: {
        name: { type: 'string', maxLength: 160 },
        imageKey: { type: 'string', maxLength: 512 },
        coinPrice: { type: 'integer', exclusiveMinimum: 0 },
        stock: { type: 'integer', minimum: 0 },
      },
    },
    ShopOrder: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        branch_id: { type: 'string', format: 'uuid' },
        item_id: { type: 'string', format: 'uuid' },
        student_id: { type: 'string', format: 'uuid' },
        coin_price: { type: 'integer' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
    Leaderboard: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['week', 'month'] },
        top: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              studentId: { type: 'string', format: 'uuid' },
              coins: { type: 'integer' },
              rank: { type: 'integer' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              avatarKey: { type: 'string', nullable: true },
            },
          },
        },
        me: {
          type: 'object',
          nullable: true,
          properties: {
            rank: { type: 'integer', nullable: true },
            coins: { type: 'integer' },
          },
        },
      },
    },

    // ---------- parent ----------
    ChildCard: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        avatarKey: { type: 'string', nullable: true },
        branchId: { type: 'string', format: 'uuid' },
        coins: { type: 'integer' },
        totalDebt: { type: 'number' },
        frozen: { type: 'boolean' },
      },
    },
    ChildOverview: {
      type: 'object',
      properties: {
        child: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            avatarKey: { type: 'string', nullable: true },
            frozen: { type: 'boolean' },
          },
        },
        coins: { type: 'integer' },
        totalDebt: { type: 'number' },
        rank: {
          type: 'object',
          nullable: true,
          properties: { rank: { type: 'integer', nullable: true }, coins: { type: 'integer' } },
        },
        groups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              subject: { type: 'string' },
              mentorName: { type: 'string' },
            },
          },
        },
        attendance: {
          type: 'object',
          properties: {
            windowDays: { type: 'integer', example: 30 },
            summary: {
              type: 'object',
              properties: {
                present: { type: 'integer' },
                absent: { type: 'integer' },
                late: { type: 'integer' },
                excused: { type: 'integer' },
                total: { type: 'integer' },
              },
            },
            recent: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  lessonDate: { type: 'string', format: 'date' },
                  status: { type: 'string' },
                  comment: { type: 'string', nullable: true },
                  groupName: { type: 'string' },
                },
              },
            },
          },
        },
        grades: {
          type: 'object',
          properties: {
            homework: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  score: { type: 'integer', nullable: true },
                  maxScore: { type: 'integer' },
                  gradedAt: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
            tests: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  score: { type: 'integer', nullable: true },
                  maxScore: { type: 'integer' },
                  finishedAt: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
      },
    },

    // ---------- methodist content ----------
    TrainingType: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string', nullable: true },
        icon: { type: 'string', nullable: true },
        sort_order: { type: 'integer' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
    CreateTrainingTypeRequest: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 160 },
        description: { type: 'string', maxLength: 1000 },
        icon: { type: 'string', maxLength: 60 },
      },
    },
    UpdateTrainingTypeRequest: {
      type: 'object',
      properties: {
        name: { type: 'string', maxLength: 160 },
        description: { type: 'string', maxLength: 1000 },
        icon: { type: 'string', maxLength: 60 },
      },
    },
    Topic: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string', nullable: true },
        video_url: { type: 'string', nullable: true },
        sort_order: { type: 'integer' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
    CreateTopicRequest: {
      type: 'object',
      required: ['trainingTypeId', 'name'],
      properties: {
        trainingTypeId: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 2000 },
        videoUrl: { type: 'string', maxLength: 500 },
      },
    },
    UpdateTopicRequest: {
      type: 'object',
      properties: {
        name: { type: 'string', maxLength: 200 },
        description: { type: 'string', maxLength: 2000 },
        videoUrl: { type: 'string', maxLength: 500 },
      },
    },
    Lesson: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        lesson_type: { type: 'string', enum: ['test', 'practical'] },
        description: { type: 'string', nullable: true },
        instruction: { type: 'string', nullable: true },
        coin_reward: { type: 'integer' },
        sort_order: { type: 'integer' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
    LessonWithQuestions: {
      allOf: [
        { $ref: '#/components/schemas/Lesson' },
        {
          type: 'object',
          properties: {
            questions: { type: 'array', items: { $ref: '#/components/schemas/Question' } },
          },
        },
      ],
    },
    CreateLessonRequest: {
      type: 'object',
      required: ['topicId', 'title', 'lessonType'],
      properties: {
        topicId: { type: 'string', format: 'uuid' },
        title: { type: 'string', minLength: 1, maxLength: 200 },
        lessonType: { type: 'string', enum: ['test', 'practical'] },
        description: { type: 'string', maxLength: 4000 },
        instruction: { type: 'string', maxLength: 2000 },
        coinReward: { type: 'integer', minimum: 0, default: 0 },
      },
    },
    UpdateLessonRequest: {
      type: 'object',
      properties: {
        title: { type: 'string', maxLength: 200 },
        description: { type: 'string', maxLength: 4000 },
        instruction: { type: 'string', maxLength: 2000 },
        coinReward: { type: 'integer', minimum: 0 },
      },
    },
    Question: {
      type: 'object',
      description:
        "'riddle' and 'open' are graded identically (case-insensitive exact match on correctTextAnswer) — "
        + 'the two values exist only so the methodist UI/analytics can tell a riddle-style question apart '
        + 'from a plain open question, not because scoring differs.',
      properties: {
        id: { type: 'string', format: 'uuid' },
        questionType: { type: 'string', enum: ['choice', 'riddle', 'open'] },
        questionText: { type: 'string' },
        optionA: { type: 'string', nullable: true },
        optionB: { type: 'string', nullable: true },
        optionC: { type: 'string', nullable: true },
        optionD: { type: 'string', nullable: true },
        correctAnswer: { type: 'string', enum: ['A', 'B', 'C', 'D'], nullable: true },
        correctTextAnswer: { type: 'string', nullable: true },
        sortOrder: { type: 'integer' },
      },
    },
    CreateQuestionRequest: {
      oneOf: [
        {
          type: 'object',
          required: ['lessonId', 'questionType', 'questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'],
          properties: {
            lessonId: { type: 'string', format: 'uuid' },
            questionType: { type: 'string', enum: ['choice'] },
            questionText: { type: 'string', minLength: 1, maxLength: 1000 },
            optionA: { type: 'string', minLength: 1, maxLength: 300 },
            optionB: { type: 'string', minLength: 1, maxLength: 300 },
            optionC: { type: 'string', minLength: 1, maxLength: 300 },
            optionD: { type: 'string', minLength: 1, maxLength: 300 },
            correctAnswer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          },
        },
        {
          type: 'object',
          required: ['lessonId', 'questionType', 'questionText', 'correctTextAnswer'],
          properties: {
            lessonId: { type: 'string', format: 'uuid' },
            questionType: { type: 'string', enum: ['riddle', 'open'] },
            questionText: { type: 'string', minLength: 1, maxLength: 1000 },
            correctTextAnswer: { type: 'string', minLength: 1, maxLength: 300 },
          },
        },
      ],
    },
    UpdateQuestionRequest: {
      description: 'Full replacement, same shape as CreateQuestionRequest minus lessonId — changing questionType is allowed.',
      oneOf: [
        {
          type: 'object',
          required: ['questionType', 'questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'],
          properties: {
            questionType: { type: 'string', enum: ['choice'] },
            questionText: { type: 'string', minLength: 1, maxLength: 1000 },
            optionA: { type: 'string', minLength: 1, maxLength: 300 },
            optionB: { type: 'string', minLength: 1, maxLength: 300 },
            optionC: { type: 'string', minLength: 1, maxLength: 300 },
            optionD: { type: 'string', minLength: 1, maxLength: 300 },
            correctAnswer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          },
        },
        {
          type: 'object',
          required: ['questionType', 'questionText', 'correctTextAnswer'],
          properties: {
            questionType: { type: 'string', enum: ['riddle', 'open'] },
            questionText: { type: 'string', minLength: 1, maxLength: 1000 },
            correctTextAnswer: { type: 'string', minLength: 1, maxLength: 300 },
          },
        },
      ],
    },

    // ---------- chat ----------
    ChatMessage: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        chat_type: { type: 'string' },
        room_key: { type: 'string' },
        sender_id: { type: 'string', format: 'uuid' },
        body: { type: 'string' },
        attachment_key: { type: 'string', nullable: true },
        created_at: { type: 'string', format: 'date-time' },
        sender_first_name: { type: 'string' },
        sender_last_name: { type: 'string' },
        sender_role: { type: 'string' },
      },
    },

    ChatContact: {
      type: 'object',
      description:
        'A parent the caller may privately message, plus that conversation’s preview. '
        + '`room_key` is the private pair room `dm:<staffId>:<parentId>` — it is never shared with other staff.',
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Parent user id' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        avatar_key: { type: 'string', nullable: true },
        child_names: {
          type: 'string',
          nullable: true,
          description: 'Comma-separated children of this parent (context for the staff member)',
        },
        room_key: { type: 'string', example: 'dm:3fa85f64-…:9c1b2d34-…' },
        last_message: { type: 'string', nullable: true },
        last_message_at: { type: 'string', format: 'date-time', nullable: true },
        unread_count: { type: 'integer', example: 2 },
      },
    },

    // ---------- users ----------
    UserProfile: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        organization_id: { type: 'string', format: 'uuid', nullable: true },
        branch_id: { type: 'string', format: 'uuid', nullable: true },
        role: { type: 'string' },
        status: { type: 'string' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        phone: { type: 'string', nullable: true },
        email: { type: 'string', nullable: true },
        avatar_key: { type: 'string', nullable: true },
        avatarUrl: { type: 'string', nullable: true, description: 'Presigned S3 URL, derived from avatar_key' },
        is_archived: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    },
    UpdateProfileRequest: {
      type: 'object',
      description: 'Partial — at least one field required',
      properties: {
        firstName: { type: 'string', maxLength: 80 },
        lastName: { type: 'string', maxLength: 80 },
        email: { type: 'string', format: 'email', maxLength: 160 },
        avatarKey: { type: 'string', maxLength: 512 },
      },
    },

    // ---------- Methodist lesson media ----------
    LessonUploadUrl: {
      type: 'object',
      description: 'Presigned S3 PUT для вложения практического задания урока',
      properties: {
        uploadUrl: { type: 'string', description: 'Presigned S3 PUT url (клиент грузит файл сюда)' },
        fileKey: { type: 'string', description: 'Ключ объекта; сохранить в урок через PATCH /lessons/:id { fileKey }' },
      },
    },

    // ---------- Discipline (взыскания + правила) ----------
    IssuePenaltyRequest: {
      type: 'object',
      required: ['targetUserId', 'type', 'reason'],
      properties: {
        targetUserId: { type: 'string', format: 'uuid', description: 'Сотрудник: admin / mentor / methodist' },
        type: { type: 'string', enum: ['sariq', 'qizil', 'qora'], description: 'sariq = жёлтое, qizil = красное предупреждение, qora = увольнение' },
        amount: { type: 'number', minimum: 0, description: 'Сумма в сумах — необязательный довесок к любому уровню, без автосписания' },
        reason: { type: 'string', maxLength: 2000 },
      },
    },
    Penalty: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: ['sariq', 'qizil', 'qora'] },
        amount: { type: 'number', nullable: true, description: 'необязательна для любого типа' },
        reason: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        target_user_id: { type: 'string', format: 'uuid' },
        target_role: { type: 'string', enum: ['admin', 'mentor', 'methodist'] },
        target_name: { type: 'string' },
        issued_by: { type: 'string', format: 'uuid' },
        issuer_role: { type: 'string', enum: ['ceo', 'admin'] },
        issued_by_name: { type: 'string' },
      },
    },
    IssuePenaltyResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            penalty: { $ref: '#/components/schemas/Penalty' },
            fired: { type: 'boolean', description: 'true если это qora (сотрудник уволен, status=fired)' },
          },
        },
      },
    },
  },
};

export default components;
