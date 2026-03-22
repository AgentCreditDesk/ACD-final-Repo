import { PrismaClient, LoanStatus } from "@prisma/client";
import { validateDecision } from "./policy.service";
import { getScoreFromChain } from "./scoring.service";
import { getTreasuryStatus } from "./treasury.service";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

export async function createLoanRequest(params: {
  borrowerAddress: string;
  amount: bigint;
  durationSeconds: number;
  purpose: string;
}) {
  const request = await prisma.loanRequest.create({
    data: {
      borrowerAddress: params.borrowerAddress.toLowerCase(),
      requestedAmount: params.amount,
      requestedDurationSeconds: params.durationSeconds,
      purpose: params.purpose,
      status: LoanStatus.PENDING,
    },
  });

  logger.info("Loan request created", { id: request.id, borrower: params.borrowerAddress });
  return request;
}

export async function getPendingRequests() {
  return prisma.loanRequest.findMany({
    where: { status: LoanStatus.PENDING },
    orderBy: { createdAt: "asc" },
  });
}

export async function processDecision(
  loanId: string,
  decision: {
    approve: boolean;
    principal?: string;
    aprBps?: number;
    durationSeconds?: number;
    rationale: string;
  }
) {
  const loan = await prisma.loanRequest.findUniqueOrThrow({ where: { id: loanId } });

  if (loan.status !== LoanStatus.PENDING) {
    throw new Error(`Loan ${loanId} is not in PENDING state, current: ${loan.status}`);
  }

  if (!decision.approve) {
    return prisma.loanRequest.update({
      where: { id: loanId },
      data: {
        status: LoanStatus.REJECTED,
        decisionRationale: decision.rationale,
      },
    });
  }

  // Validate the approved terms against policy
  const principal = BigInt(decision.principal || loan.requestedAmount.toString());
  const aprBps = decision.aprBps || 1000;
  const durationSeconds = decision.durationSeconds || loan.requestedDurationSeconds;

  const scoreData = await getScoreFromChain(loan.borrowerAddress);
  const treasury = await getTreasuryStatus();

  // Calculate borrower's outstanding loans
  const borrowerLoans = await prisma.loanRequest.findMany({
    where: {
      borrowerAddress: loan.borrowerAddress,
      status: { in: [LoanStatus.FUNDED, LoanStatus.DRAWN] },
    },
    select: { termsPrincipal: true },
  });
  const borrowerOutstanding = borrowerLoans.reduce(
    (sum, l) => sum + (l.termsPrincipal || 0n),
    0n
  );

  const validation = validateDecision({
    principal,
    aprBps,
    durationSeconds,
    borrowerScore: scoreData.score,
    borrowerDefaults: scoreData.loansDefaulted,
    totalTreasury: BigInt(treasury.totalTreasury),
    outstandingLoans: BigInt(treasury.outstandingLoans),
    borrowerOutstanding,
  });

  if (!validation.valid) {
    logger.warn("Decision failed policy validation", { loanId, errors: validation.errors });
    return prisma.loanRequest.update({
      where: { id: loanId },
      data: {
        status: LoanStatus.REJECTED,
        decisionRationale: `Policy violation: ${validation.errors.join("; ")}. Original rationale: ${decision.rationale}`,
      },
    });
  }

  return prisma.loanRequest.update({
    where: { id: loanId },
    data: {
      status: LoanStatus.APPROVED,
      termsPrincipal: principal,
      termsAprBps: aprBps,
      decisionRationale: decision.rationale,
    },
  });
}

export async function getLoanById(id: string) {
  return prisma.loanRequest.findUnique({ where: { id } });
}

export async function getLoansByBorrower(borrowerAddress: string) {
  return prisma.loanRequest.findMany({
    where: { borrowerAddress: borrowerAddress.toLowerCase() },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllLoans(limit = 50) {
  return prisma.loanRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getLoanStats() {
  const [total, pending, approved, funded, drawn, repaid, defaulted] = await Promise.all([
    prisma.loanRequest.count(),
    prisma.loanRequest.count({ where: { status: LoanStatus.PENDING } }),
    prisma.loanRequest.count({ where: { status: LoanStatus.APPROVED } }),
    prisma.loanRequest.count({ where: { status: LoanStatus.FUNDED } }),
    prisma.loanRequest.count({ where: { status: LoanStatus.DRAWN } }),
    prisma.loanRequest.count({ where: { status: LoanStatus.REPAID } }),
    prisma.loanRequest.count({ where: { status: LoanStatus.DEFAULTED } }),
  ]);

  return { total, pending, approved, funded, drawn, repaid, defaulted };
}
