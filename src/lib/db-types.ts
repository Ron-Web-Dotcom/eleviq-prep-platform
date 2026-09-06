// Auto-generated from your database schema — do not edit by hand.
// Regenerates automatically whenever a table is created or altered.

export type AccountLockoutsRow = {
  id: string
  email: string
  userId: string | null
  failedAttempts: number | string
  lockedUntil: string | null
  lastFailedAt: string | null
  lockoutCount: number | string
  resetSentAt: string | null
  resetSentBy: string | null
  createdAt: string
  updatedAt: string
}

export type AssignmentsRow = {
  id: string
  studentId: string
  assignedBy: string
  title: string
  assignmentType: string
  resourceId: string | null
  dueAt: string | null
  status: string
  createdAt: string
}

export type AuditLogsRow = {
  id: string
  userId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  result: string
  metadataJson: string
  createdAt: string
}

export type ChatMessagesRow = {
  id: string
  senderUserId: string
  recipientUserId: string
  messageType: string
  body: string | null
  audioUrl: string | null
  audioDurationSeconds: number | string | null
  createdAt: string
  readAt: string | null
}

export type ContentPagesRow = {
  id: string
  slug: string
  title: string
  body: string
  metaTitle: string | null
  metaDescription: string | null
  status: string
  updatedBy: string | null
  updatedAt: string
}

export type EnrollmentsRow = {
  id: string
  studentId: string
  packageId: string
  startDate: string | null
  endDate: string | null
  status: string
  createdAt: string
}

export type FaqsRow = {
  id: string
  category: string
  question: string
  answer: string
  position: number | string
  status: string
  updatedAt: string
}

export type LeadsRow = {
  id: string
  userId: string | null
  name: string
  email: string
  phone: string | null
  programInterest: string | null
  examDate: string | null
  packageInterest: string | null
  source: string | null
  stage: string
  notes: string | null
  followUpAt: string | null
  assignedStaffId: string | null
  createdAt: string
  updatedAt: string
}

export type LockoutEventsRow = {
  id: string
  email: string
  userId: string | null
  lockedUntil: string
  attemptCount: number | string
  notifiedAt: string | null
  resolvedAt: string | null
  resolvedBy: string | null
  resolution: string | null
  createdAt: string
}

export type NotificationsRow = {
  id: string
  userId: string
  title: string
  body: string
  type: string
  readAt: string | null
  createdAt: string
}

export type OrderItemsRow = {
  id: string
  orderId: string
  productId: string
  quantity: number | string
  unitPriceCents: number | string
}

export type OrdersRow = {
  id: string
  userId: string
  orderNumber: string
  subtotalCents: number | string
  shippingCents: number | string
  taxCents: number | string
  totalCents: number | string
  paymentStatus: string
  fulfillmentStatus: string
  createdAt: string
  updatedAt: string
}

export type PackagesRow = {
  id: string
  programId: string
  name: string
  slug: string
  description: string | null
  priceCents: number | string
  billingType: string
  featuresJson: string
  status: string
  createdAt: string
  updatedAt: string
}

export type PasswordResetSessionsRow = {
  id: string
  email: string
  tokenHash: string
  expiresAt: string
  usedAt: string | null
  createdAt: string
}

export type ProductsRow = {
  id: string
  name: string
  slug: string
  description: string | null
  productType: string
  category: string | null
  priceCents: number | string
  coverImageUrl: string | null
  amazonUrl: string | null
  inventoryAvailable: number | string
  lowStockThreshold: number | string
  status: string
  createdAt: string
  updatedAt: string
}

export type ProgramsRow = {
  id: string
  name: string
  slug: string
  description: string | null
  examType: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export type QuestionsRow = {
  id: string
  programId: string | null
  questionText: string
  questionType: string
  choicesJson: string
  correctAnswersJson: string
  rationale: string | null
  topic: string | null
  subtopic: string | null
  difficulty: string | null
  clinicalJudgmentCategory: string | null
  tagsJson: string
  status: string
  authorSource: string | null
  createdAt: string
  updatedAt: string
  scenarioJson: string | null
  interactionJson: string | null
  caseId: string | null
  caseOrder: number | string | null
}

export type ReviewsRow = {
  id: string
  userId: string
  authorName: string
  role: string | null
  rating: number | string
  body: string
  status: string
  createdAt: string
}

export type RolesRow = {
  id: string
  name: string
  description: string | null
  createdAt: string
}

export type StudentAnswersRow = {
  id: string
  attemptId: string
  questionId: string
  answerJson: string
  isCorrect: string
  timeSpentSeconds: number | string
  errorClassification: string | null
  createdAt: string
}

export type StudentProfilesRow = {
  id: string
  userId: string
  phone: string | null
  school: string | null
  programType: string | null
  examType: string | null
  graduationDate: string | null
  examDate: string | null
  goals: string | null
  notes: string | null
  status: string
  readinessScore: number | string | null
  assignedTutorId: string | null
  createdAt: string
  updatedAt: string
}

export type TemporaryPasswordsRow = {
  id: string
  email: string
  userId: string
  salt: string
  passwordHash: string
  expiresAt: string
  usedAt: string | null
  resetProofHash: string | null
  completedAt: string | null
  createdBy: string
  createdAt: string
}

export type TestAttemptsRow = {
  id: string
  userId: string
  testId: string
  scorePercent: number | string | null
  startedAt: string
  submittedAt: string | null
  status: string
}

export type TestQuestionsRow = {
  id: string
  testId: string
  questionId: string
  position: number | string
  points: number | string
}

export type TestsRow = {
  id: string
  programId: string | null
  title: string
  description: string | null
  mode: string
  timeLimitMinutes: number | string | null
  showRationales: string
  retakeAllowed: string
  status: string
  createdAt: string
}

export type TutoringSessionsRow = {
  id: string
  studentId: string
  tutorId: string
  startsAt: string
  endsAt: string
  timezone: string
  status: string
  attendance: string | null
  createdAt: string
  googleEventId: string | null
  calendarSyncStatus: string
}

export type UserRolesRow = {
  id: string
  userId: string
  roleId: string
  createdAt: string
}

export type UsersRow = {
  id: string
  email: string
  emailVerified: number | string | null
  displayName: string | null
  avatarUrl: string | null
  phone: string | null
  phoneVerified: number | string | null
  role: string | null
  metadata: string | null
  createdAt: string
  updatedAt: string
  lastSignIn: string
}
