import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function main() {
  console.log("Seeding database...\n");

  // Clean existing data
  await prisma.contractLegalBasis.deleteMany();
  await prisma.contractParty.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.legalBasis.deleteMany();
  await prisma.appliedSeal.deleteMany();
  await prisma.companySeal.deleteMany();
  await prisma.planQuota.deleteMany();
  await prisma.certificateRenewalAlert.deleteMany();
  await prisma.verificationCode.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.timestampEntry.deleteMany();
  await prisma.signature.deleteMany();
  await prisma.signingRequest.deleteMany();
  await prisma.signingTemplate.deleteMany();
  await prisma.document.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.contactRequest.deleteMany();

  const password = await bcrypt.hash("password123", 10);

  // ==================== Organizations ====================
  const org1 = await prisma.organization.create({
    data: {
      name: "Doc.al Solutions",
      domain: "doc.al",
      plan: "ENTERPRISE",
      apiQuota: 10000,
      primaryColor: "#dc2626",
      emailFromName: "Doc.al",
    },
  });

  const org2 = await prisma.organization.create({
    data: {
      name: "Ministria e Drejtesise",
      domain: "drejtesia.gov.al",
      plan: "PRO",
      apiQuota: 5000,
      primaryColor: "#1d4ed8",
      emailFromName: "Ministria e Drejtesise",
    },
  });

  const org3 = await prisma.organization.create({
    data: {
      name: "Banka Kombetare Tregtare",
      domain: "bkt.com.al",
      plan: "PRO",
      apiQuota: 3000,
      primaryColor: "#047857",
      emailFromName: "BKT",
    },
  });

  const org4 = await prisma.organization.create({
    data: {
      name: "GigBook Platform",
      domain: "gigbook.al",
      plan: "PRO",
      apiQuota: 2000,
      primaryColor: "#7c3aed",
      emailFromName: "GigBook",
    },
  });

  const org5 = await prisma.organization.create({
    data: {
      name: "MAIF Assurance Albania",
      domain: "maif.al",
      plan: "ENTERPRISE",
      apiQuota: 5000,
      primaryColor: "#dc2626",
      emailFromName: "MAIF Albania",
    },
  });

  console.log("  Organizations created (5)");

  // ==================== Users ====================
  const superAdmin = await prisma.user.create({
    data: {
      email: "admin@doc.al",
      name: "Super Admin",
      password,
      role: "SUPER_ADMIN",
      kycStatus: "VERIFIED",
      emailVerified: new Date(),
      organizationId: org1.id,
      phone: "+355691234567",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "daniel@doc.al",
      name: "Daniel Kasa",
      password,
      role: "ADMIN",
      kycStatus: "VERIFIED",
      emailVerified: new Date(),
      organizationId: org1.id,
      phone: "+355692345678",
    },
  });

  const user1 = await prisma.user.create({
    data: {
      email: "arben@drejtesia.gov.al",
      name: "Arben Malaj",
      password,
      role: "USER",
      kycStatus: "VERIFIED",
      emailVerified: new Date(),
      organizationId: org2.id,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "elira@bkt.com.al",
      name: "Elira Hoxha",
      password,
      role: "USER",
      kycStatus: "VERIFIED",
      emailVerified: new Date(),
      organizationId: org3.id,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: "besnik@gmail.com",
      name: "Besnik Shehu",
      password,
      role: "USER",
      kycStatus: "PENDING",
      emailVerified: new Date(),
      phone: "+355694567890",
      kycDocumentUrl: "/uploads/kyc/demo/front_besnik.svg",
      kycMetadata: {
        fullName: "Besnik Shehu",
        dateOfBirth: "1985-03-15",
        idNumber: "I12345678A",
        nationality: "Shqiptar",
        address: "Rruga Myslym Shyri, Nr. 42",
        city: "Tirane",
        phone: "+355694567890",
        documentType: "Karte Identiteti",
        frontDocumentUrl: "/uploads/kyc/demo/front_besnik.svg",
        backDocumentUrl: "/uploads/kyc/demo/back_besnik.svg",
        selfieUrl: "/uploads/kyc/demo/selfie_besnik.svg",
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  });

  // User with PENDING KYC (passport)
  const user3b = await prisma.user.create({
    data: {
      email: "arlind@hotmail.com",
      name: "Arlind Krasniqi",
      password,
      role: "USER",
      kycStatus: "PENDING",
      emailVerified: new Date(),
      phone: "+38345123456",
      kycDocumentUrl: "/uploads/kyc/demo/front_arlind.svg",
      kycMetadata: {
        fullName: "Arlind Krasniqi",
        dateOfBirth: "1992-07-22",
        idNumber: "1100789456",
        nationality: "Kosovar",
        address: "Bulevardi Nena Tereze, Nr. 18",
        city: "Prishtine",
        phone: "+38345123456",
        documentType: "Pasaporte",
        frontDocumentUrl: "/uploads/kyc/demo/front_arlind.svg",
        selfieUrl: "/uploads/kyc/demo/selfie_arlind.svg",
        submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
    },
  });

  // User with REJECTED KYC
  const user3c = await prisma.user.create({
    data: {
      email: "fatjon@yahoo.com",
      name: "Fatjon Dervishi",
      password,
      role: "USER",
      kycStatus: "REJECTED",
      emailVerified: new Date(),
      phone: "+355697654321",
      kycDocumentUrl: "/uploads/kyc/demo/front_fatjon.svg",
      kycMetadata: {
        fullName: "Fatjon Dervishi",
        dateOfBirth: "1990-11-30",
        idNumber: "J98765432B",
        nationality: "Shqiptar",
        address: "Rruga e Durresit, Nr. 5",
        city: "Durres",
        phone: "+355697654321",
        documentType: "Patente Shofer",
        frontDocumentUrl: "/uploads/kyc/demo/front_fatjon.svg",
        backDocumentUrl: "/uploads/kyc/demo/back_fatjon.svg",
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  });

  const user4 = await prisma.user.create({
    data: {
      email: "teuta@yahoo.com",
      name: "Teuta Balla",
      password,
      role: "USER",
      kycStatus: "VERIFIED",
      emailVerified: new Date(),
      phone: "+355695678901",
      kycVerifiedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      kycDocumentUrl: "/uploads/kyc/demo/front_teuta.svg",
      kycMetadata: {
        fullName: "Teuta Balla",
        dateOfBirth: "1988-06-12",
        idNumber: "K55443322C",
        nationality: "Shqiptar",
        address: "Rruga Ismail Qemali, Nr. 7",
        city: "Vlore",
        phone: "+355695678901",
        documentType: "Karte Identiteti",
        frontDocumentUrl: "/uploads/kyc/demo/front_teuta.svg",
        backDocumentUrl: "/uploads/kyc/demo/back_teuta.svg",
        selfieUrl: "/uploads/kyc/demo/selfie_teuta.svg",
        submittedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  });

  const apiUser = await prisma.user.create({
    data: {
      email: "api@doc.al",
      name: "API Service Account",
      password,
      role: "API_USER",
      kycStatus: "VERIFIED",
      emailVerified: new Date(),
      organizationId: org1.id,
    },
  });

  const gigbookApi = await prisma.user.create({
    data: {
      email: "api@gigbook.al",
      name: "GigBook API",
      password,
      role: "API_USER",
      kycStatus: "VERIFIED",
      emailVerified: new Date(),
      organizationId: org4.id,
    },
  });

  const maifUser = await prisma.user.create({
    data: {
      email: "agent@maif.al",
      name: "Klaudio Bregu",
      password,
      role: "USER",
      kycStatus: "VERIFIED",
      emailVerified: new Date(),
      organizationId: org5.id,
    },
  });

  // Suppress unused variable warnings for seed-only users
  void user3b;
  void user3c;

  console.log("  Users created (12)");

  // ==================== Certificates ====================
  const cert1 = await prisma.certificate.create({
    data: {
      serialNumber: "DOCAL-2026-000001",
      subjectDN: "CN=Daniel Kasa,O=Doc.al Solutions,C=AL",
      issuerDN: "CN=Doc.al CA,O=Doc.al Solutions,C=AL",
      publicKey: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWe\nFakePKeyForTestingPurposes0123456789ABCDEFGHIJKLMNOP\n-----END PUBLIC KEY-----",
      encryptedPrivateKey: "encrypted-private-key-placeholder",
      validFrom: new Date("2026-01-01"),
      validTo: new Date("2027-01-01"),
      type: "PERSONAL",
      userId: admin.id,
      organizationId: org1.id,
    },
  });

  const cert2 = await prisma.certificate.create({
    data: {
      serialNumber: "DOCAL-2026-000002",
      subjectDN: "CN=Arben Malaj,O=Ministria e Drejtesise,C=AL",
      issuerDN: "CN=Doc.al CA,O=Doc.al Solutions,C=AL",
      publicKey: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1X4VS5JJcds3xfn/ygWe\nFakePKeyForTestingPurposes0123456789ABCDEFGHIJKLMNOP\n-----END PUBLIC KEY-----",
      encryptedPrivateKey: "encrypted-private-key-placeholder-2",
      validFrom: new Date("2026-02-01"),
      validTo: new Date("2027-02-01"),
      type: "PERSONAL",
      userId: user1.id,
      organizationId: org2.id,
    },
  });

  const cert3 = await prisma.certificate.create({
    data: {
      serialNumber: "DOCAL-2026-000003",
      subjectDN: "CN=Elira Hoxha,O=Banka Kombetare Tregtare,C=AL",
      issuerDN: "CN=Doc.al CA,O=Doc.al Solutions,C=AL",
      publicKey: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2Y5VS5JJcds3xfn/ygWe\nFakePKeyForTestingPurposes0123456789ABCDEFGHIJKLMNOP\n-----END PUBLIC KEY-----",
      encryptedPrivateKey: "encrypted-private-key-placeholder-3",
      validFrom: new Date("2026-03-01"),
      validTo: new Date("2027-03-01"),
      type: "ORGANIZATION",
      userId: user2.id,
      organizationId: org3.id,
    },
  });

  await prisma.certificate.create({
    data: {
      serialNumber: "DOCAL-2026-000004",
      subjectDN: "CN=TSA Service,O=Doc.al Solutions,C=AL",
      issuerDN: "CN=Doc.al Root CA,O=Doc.al Solutions,C=AL",
      publicKey: "-----BEGIN PUBLIC KEY-----\nTSAPublicKeyPlaceholder\n-----END PUBLIC KEY-----",
      encryptedPrivateKey: "encrypted-tsa-key-placeholder",
      validFrom: new Date("2026-01-01"),
      validTo: new Date("2028-01-01"),
      type: "TSA",
      organizationId: org1.id,
    },
  });

  // Certificate about to expire (for testing renewal alerts)
  const certExpiring = await prisma.certificate.create({
    data: {
      serialNumber: "DOCAL-2026-000005",
      subjectDN: "CN=Besnik Shehu,C=AL",
      issuerDN: "CN=Doc.al CA,O=Doc.al Solutions,C=AL",
      publicKey: "-----BEGIN PUBLIC KEY-----\nExpiringCertKeyPlaceholder\n-----END PUBLIC KEY-----",
      encryptedPrivateKey: "encrypted-expiring-key",
      validFrom: new Date("2025-04-15"),
      validTo: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      type: "PERSONAL",
      userId: user3.id,
    },
  });

  // Certificate expiring very soon (for daily alert testing)
  await prisma.certificate.create({
    data: {
      serialNumber: "DOCAL-2026-000006",
      subjectDN: "CN=GigBook Platform,O=GigBook Platform,C=AL",
      issuerDN: "CN=Doc.al CA,O=Doc.al Solutions,C=AL",
      publicKey: "-----BEGIN PUBLIC KEY-----\nGigBookCertKeyPlaceholder\n-----END PUBLIC KEY-----",
      encryptedPrivateKey: "encrypted-gigbook-key",
      validFrom: new Date("2025-03-01"),
      validTo: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      type: "ORGANIZATION",
      userId: gigbookApi.id,
      organizationId: org4.id,
    },
  });

  // Create renewal alerts for expiring cert
  await prisma.certificateRenewalAlert.create({
    data: {
      certificateId: certExpiring.id,
      daysBeforeExpiry: 90,
      status: "SENT",
      sentAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.certificateRenewalAlert.create({
    data: {
      certificateId: certExpiring.id,
      daysBeforeExpiry: 60,
      status: "SENT",
      sentAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("  Certificates created (6) with renewal alerts");

  // ==================== Documents ====================
  const documents = [];
  const docData = [
    { title: "Kontrate Shitblerje Apartamenti", fileName: "kontrate-shitblerje.pdf", status: "COMPLETED" as const, ownerId: admin.id, orgId: org1.id, size: 245000 },
    { title: "Marreveshje Bashkepunimi BKT-DocAl", fileName: "marreveshje-bashkepunimi.pdf", status: "COMPLETED" as const, ownerId: user2.id, orgId: org3.id, size: 180000 },
    { title: "Vendim Gjykate Nr.1234/2026", fileName: "vendim-gjykate-1234.pdf", status: "PENDING_SIGNATURE" as const, ownerId: user1.id, orgId: org2.id, size: 520000 },
    { title: "Prokure e Pergjithshme", fileName: "prokure-pergjithshme.pdf", status: "PARTIALLY_SIGNED" as const, ownerId: admin.id, orgId: org1.id, size: 95000 },
    { title: "Akt Noterial Nr.567", fileName: "akt-noterial-567.pdf", status: "COMPLETED" as const, ownerId: user1.id, orgId: org2.id, size: 310000 },
    { title: "Kontrate Punesimi - IT Developer", fileName: "kontrate-punesimi.pdf", status: "PENDING_SIGNATURE" as const, ownerId: admin.id, orgId: org1.id, size: 155000 },
    { title: "NDA - Konfidencialitet", fileName: "nda-konfidencialitet.pdf", status: "DRAFT" as const, ownerId: user2.id, orgId: org3.id, size: 78000 },
    { title: "Marreveshje Kredie Bankare", fileName: "marreveshje-kredie.pdf", status: "COMPLETED" as const, ownerId: user2.id, orgId: org3.id, size: 450000 },
    { title: "Vendim Asambleje Aksionerash", fileName: "vendim-asambleje.pdf", status: "COMPLETED" as const, ownerId: admin.id, orgId: org1.id, size: 125000 },
    { title: "Kontrate Qiraje Zyra", fileName: "kontrate-qiraje.pdf", status: "PENDING_SIGNATURE" as const, ownerId: user4.id, orgId: null, size: 200000 },
    { title: "Autorizim Perfaqesimi", fileName: "autorizim.pdf", status: "COMPLETED" as const, ownerId: user3.id, orgId: null, size: 65000 },
    { title: "Raport Auditimi Financiar 2025", fileName: "raport-auditimi.pdf", status: "ARCHIVED" as const, ownerId: user2.id, orgId: org3.id, size: 890000 },
    // GigBook API-generated contracts
    { title: "Kontrate Rezervimi ne GIGBOOK", fileName: "gigbook-rezervim-001.pdf", status: "PENDING_SIGNATURE" as const, ownerId: gigbookApi.id, orgId: org4.id, size: 120000 },
    { title: "Kontrate Sherbimi GIGBOOK - Band Live", fileName: "gigbook-sherbim-002.pdf", status: "COMPLETED" as const, ownerId: gigbookApi.id, orgId: org4.id, size: 95000 },
    // MAIF contracts
    { title: "Kontrate Sigurimi Auto-Moto RENAULT AUSTRAL", fileName: "maif-auto-moto.pdf", status: "PENDING_SIGNATURE" as const, ownerId: maifUser.id, orgId: org5.id, size: 340000 },
    { title: "Kushtet e Pergjithshme Sigurimi VAM", fileName: "maif-kushtet-vam.pdf", status: "COMPLETED" as const, ownerId: maifUser.id, orgId: org5.id, size: 580000 },
  ];

  for (const d of docData) {
    const hash = sha256(d.fileName + Date.now() + Math.random());
    const doc = await prisma.document.create({
      data: {
        title: d.title,
        fileName: d.fileName,
        fileHash: hash,
        fileUrl: `/uploads/${d.fileName}`,
        fileSize: d.size,
        status: d.status,
        ownerId: d.ownerId,
        organizationId: d.orgId,
      },
    });
    documents.push(doc);
  }

  console.log("  Documents created (16)");

  // ==================== Signatures ====================
  const signatureData = [
    { docIdx: 0, signerEmail: admin.email, signerName: admin.name, status: "SIGNED" as const, signerId: admin.id, certId: cert1.id },
    { docIdx: 0, signerEmail: user2.email, signerName: user2.name, status: "SIGNED" as const, signerId: user2.id, certId: cert3.id },
    { docIdx: 1, signerEmail: user2.email, signerName: user2.name, status: "SIGNED" as const, signerId: user2.id, certId: cert3.id },
    { docIdx: 1, signerEmail: admin.email, signerName: admin.name, status: "SIGNED" as const, signerId: admin.id, certId: cert1.id },
    { docIdx: 2, signerEmail: user1.email, signerName: user1.name, status: "PENDING" as const, signerId: user1.id, certId: null },
    { docIdx: 2, signerEmail: "gjyqtar@drejtesia.gov.al", signerName: "Ilir Poda", status: "PENDING" as const, signerId: null, certId: null },
    { docIdx: 3, signerEmail: admin.email, signerName: admin.name, status: "SIGNED" as const, signerId: admin.id, certId: cert1.id },
    { docIdx: 3, signerEmail: user3.email, signerName: user3.name, status: "PENDING" as const, signerId: user3.id, certId: null },
    { docIdx: 4, signerEmail: user1.email, signerName: user1.name, status: "SIGNED" as const, signerId: user1.id, certId: cert2.id },
    { docIdx: 5, signerEmail: "kandidat@gmail.com", signerName: "Andi Marku", status: "PENDING" as const, signerId: null, certId: null },
    { docIdx: 5, signerEmail: admin.email, signerName: admin.name, status: "PENDING" as const, signerId: admin.id, certId: null },
    { docIdx: 7, signerEmail: user2.email, signerName: user2.name, status: "SIGNED" as const, signerId: user2.id, certId: cert3.id },
    { docIdx: 8, signerEmail: admin.email, signerName: admin.name, status: "SIGNED" as const, signerId: admin.id, certId: cert1.id },
    { docIdx: 9, signerEmail: user4.email, signerName: user4.name, status: "PENDING" as const, signerId: user4.id, certId: null },
    { docIdx: 10, signerEmail: user3.email, signerName: user3.name, status: "SIGNED" as const, signerId: user3.id, certId: null },
    // GigBook contract signers
    { docIdx: 12, signerEmail: "artisti@gmail.com", signerName: "Erion Murati", status: "PENDING" as const, signerId: null, certId: null },
    { docIdx: 12, signerEmail: "venue@tirana.al", signerName: "Hotel Tirana International", status: "PENDING" as const, signerId: null, certId: null },
    { docIdx: 13, signerEmail: "band@muzika.al", signerName: "Grupi Fishta", status: "SIGNED" as const, signerId: null, certId: null },
    { docIdx: 13, signerEmail: "menaxher@gigbook.al", signerName: "Aldo Kruja", status: "SIGNED" as const, signerId: null, certId: null },
    // MAIF signers
    { docIdx: 14, signerEmail: "daniel@doc.al", signerName: "Daniel Kordhoni", status: "PENDING" as const, signerId: admin.id, certId: null },
    { docIdx: 15, signerEmail: "daniel@doc.al", signerName: "Daniel Kordhoni", status: "SIGNED" as const, signerId: admin.id, certId: cert1.id },
    { docIdx: 15, signerEmail: "agent@maif.al", signerName: "Pascal Demurger", status: "SIGNED" as const, signerId: maifUser.id, certId: null },
  ];

  const signatures = [];
  for (let i = 0; i < signatureData.length; i++) {
    const s = signatureData[i];
    const sig = await prisma.signature.create({
      data: {
        signerEmail: s.signerEmail,
        signerName: s.signerName,
        status: s.status,
        signedAt: s.status === "SIGNED" ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
        order: i % 3,
        token: crypto.randomBytes(32).toString("hex"),
        documentId: documents[s.docIdx].id,
        signerId: s.signerId,
        certificateId: s.certId,
        viewedAt: s.status === "SIGNED" ? new Date(Date.now() - Math.random() * 31 * 24 * 60 * 60 * 1000) : (Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) : null),
      },
    });
    signatures.push(sig);
  }

  console.log("  Signatures created (22)");

  // ==================== Timestamp Entries (Chain) ====================
  let prevFingerprint = "0000000000000000000000000000000000000000000000000000000000000000";
  let prevEntryId: string | null = null;

  const tsData = [
    { type: "SINGLE_FILE" as const, docIdx: 0, sigIdx: null, daysAgo: 28 },
    { type: "SIGNATURE" as const, docIdx: 0, sigIdx: 0, daysAgo: 27 },
    { type: "SIGNATURE" as const, docIdx: 0, sigIdx: 1, daysAgo: 26 },
    { type: "SINGLE_FILE" as const, docIdx: 1, sigIdx: null, daysAgo: 25 },
    { type: "SIGNATURE" as const, docIdx: 1, sigIdx: 2, daysAgo: 24 },
    { type: "SIGNATURE" as const, docIdx: 1, sigIdx: 3, daysAgo: 23 },
    { type: "SUBMITTED_HASH" as const, docIdx: null, sigIdx: null, daysAgo: 22 },
    { type: "SINGLE_FILE" as const, docIdx: 2, sigIdx: null, daysAgo: 20 },
    { type: "SINGLE_FILE" as const, docIdx: 3, sigIdx: null, daysAgo: 18 },
    { type: "SIGNATURE" as const, docIdx: 3, sigIdx: 6, daysAgo: 17 },
    { type: "SINGLE_FILE" as const, docIdx: 4, sigIdx: null, daysAgo: 15 },
    { type: "SIGNATURE" as const, docIdx: 4, sigIdx: 8, daysAgo: 14 },
    { type: "SUBMITTED_HASH" as const, docIdx: null, sigIdx: null, daysAgo: 13 },
    { type: "SINGLE_FILE" as const, docIdx: 5, sigIdx: null, daysAgo: 11 },
    { type: "SINGLE_FILE" as const, docIdx: 7, sigIdx: null, daysAgo: 10 },
    { type: "SIGNATURE" as const, docIdx: 7, sigIdx: 11, daysAgo: 9 },
    { type: "SINGLE_FILE" as const, docIdx: 8, sigIdx: null, daysAgo: 8 },
    { type: "SIGNATURE" as const, docIdx: 8, sigIdx: 12, daysAgo: 7 },
    { type: "SUBMITTED_HASH" as const, docIdx: null, sigIdx: null, daysAgo: 5 },
    { type: "SINGLE_FILE" as const, docIdx: 9, sigIdx: null, daysAgo: 4 },
    { type: "SINGLE_FILE" as const, docIdx: 10, sigIdx: null, daysAgo: 3 },
    { type: "SIGNATURE" as const, docIdx: 10, sigIdx: 14, daysAgo: 2 },
    { type: "SINGLE_FILE" as const, docIdx: 11, sigIdx: null, daysAgo: 1 },
    { type: "SUBMITTED_HASH" as const, docIdx: null, sigIdx: null, daysAgo: 0 },
  ];

  for (let i = 0; i < tsData.length; i++) {
    const ts = tsData[i];
    const serverTimestamp = new Date(Date.now() - ts.daysAgo * 24 * 60 * 60 * 1000);

    const fingerprint = ts.docIdx !== null
      ? documents[ts.docIdx].fileHash
      : sha256("external-hash-" + i + "-" + Date.now());

    const sequentialFingerprint = sha256(prevFingerprint + fingerprint + serverTimestamp.toISOString());

    const isConfirmed = i < 8;

    const entry: { id: string } = await prisma.timestampEntry.create({
      data: {
        fingerprint,
        sequentialFingerprint,
        type: ts.type,
        serverTimestamp,
        btcTxId: isConfirmed ? sha256("btctx-" + i).slice(0, 64) : null,
        btcBlockHeight: isConfirmed ? 880000 + i * 3 : null,
        btcBlockHash: isConfirmed ? sha256("btcblock-" + i).slice(0, 64) : null,
        otsStatus: isConfirmed ? "CONFIRMED" : "PENDING",
        documentId: ts.docIdx !== null ? documents[ts.docIdx].id : null,
        signatureId: ts.sigIdx !== null ? signatures[ts.sigIdx].id : null,
        previousEntryId: prevEntryId,
      },
    });

    prevFingerprint = sequentialFingerprint;
    prevEntryId = entry.id;
  }

  console.log("  Timestamp entries created (chain of 24)");

  // ==================== API Keys ====================
  await prisma.apiKey.create({
    data: {
      key: sha256("docal_live_test_key_123456789"),
      name: "Production API Key",
      permissions: JSON.stringify({ timestamp: true, documents: true, verify: true, signing: true }),
      rateLimit: 1000,
      active: true,
      userId: apiUser.id,
      organizationId: org1.id,
    },
  });

  await prisma.apiKey.create({
    data: {
      key: sha256("docal_test_bkt_key_987654321"),
      name: "BKT Integration Key",
      permissions: JSON.stringify({ timestamp: true, verify: true }),
      rateLimit: 500,
      active: true,
      userId: user2.id,
      organizationId: org3.id,
    },
  });

  await prisma.apiKey.create({
    data: {
      key: sha256("gigbook_api_key_live_2026"),
      name: "GigBook Signing API",
      permissions: JSON.stringify({ signing: true, documents: true, verify: true }),
      rateLimit: 1000,
      active: true,
      userId: gigbookApi.id,
      organizationId: org4.id,
    },
  });

  console.log("  API Keys created (3)");

  // ==================== Signing Templates (6 pdfme-based) ====================
  // All templates use pdfme visual editor format with multi-page support
  // Footer with QR, DataMatrix, logo, page number is added at render time

  // Helper: create pdfmeTemplate JSON with proper schema structure
  // Positions are in mm (A4: 210x297), footer occupies bottom 32mm
  function pdfme(schemas: Record<string, unknown>[][], pageCount: number) {
    return JSON.stringify({ schemas, basePdf: "BLANK", pageCount });
  }

  // Template 1: Kontrate Standarde 2 Pale (1 page)
  await prisma.signingTemplate.create({
    data: {
      name: "Kontrate Standarde 2 Pale",
      description: "Template i thjeshte per kontrata mes dy paleve. Perfshin fushat per emrat, datat dhe nenshkrimet e te dyja paleve.",
      category: "kontrate",
      fields: JSON.stringify([
        { type: "text", label: "Titulli i Kontrates", required: true, position: { page: 0, x: 85, y: 56, width: 340, height: 28 }, assignedTo: "1" },
        { type: "text", label: "Emri i Pales se Pare", required: true, position: { page: 0, x: 85, y: 198, width: 280, height: 25 }, assignedTo: "1" },
        { type: "text", label: "Emri i Pales se Dyte", required: true, position: { page: 0, x: 85, y: 255, width: 280, height: 25 }, assignedTo: "2" },
        { type: "text", label: "Permbajtja", required: true, position: { page: 0, x: 85, y: 340, width: 450, height: 200 }, assignedTo: "1" },
        { type: "date", label: "Data e Nenshkrimit", required: true, position: { page: 0, x: 85, y: 595, width: 142, height: 25 }, assignedTo: "1" },
        { type: "signature", label: "Nenshkrimi Pale 1", required: true, position: { page: 0, x: 85, y: 650, width: 200, height: 65 }, assignedTo: "1" },
        { type: "signature", label: "Nenshkrimi Pale 2", required: true, position: { page: 0, x: 340, y: 650, width: 200, height: 65 }, assignedTo: "2" },
      ]),
      signerRoles: JSON.stringify([
        { id: "1", name: "Pala e Pare", color: "#dc2626" },
        { id: "2", name: "Pala e Dyte", color: "#2563eb" },
      ]),
      pdfmeTemplate: pdfme([
        [
          { name: "Titulli i Kontrates", type: "text", content: "", position: { x: 30, y: 20 }, width: 120, height: 10, fontSize: 16, fontColor: "#18181b", alignment: "center" },
          { name: "Emri i Pales se Pare", type: "text", content: "", position: { x: 30, y: 70 }, width: 100, height: 8, fontSize: 11, fontColor: "#18181b" },
          { name: "Emri i Pales se Dyte", type: "text", content: "", position: { x: 30, y: 90 }, width: 100, height: 8, fontSize: 11, fontColor: "#18181b" },
          { name: "Permbajtja", type: "text", content: "", position: { x: 15, y: 120 }, width: 180, height: 80, fontSize: 10, fontColor: "#3f3f46" },
          { name: "Data e Nenshkrimit", type: "date", content: "", position: { x: 15, y: 210 }, width: 50, height: 8 },
          { name: "Nenshkrimi Pale 1", type: "image", content: "", position: { x: 15, y: 225 }, width: 70, height: 25 },
          { name: "Nenshkrimi Pale 2", type: "image", content: "", position: { x: 120, y: 225 }, width: 70, height: 25 },
        ],
      ], 1),
      isPublic: true,
      usageCount: 47,
      userId: admin.id,
      organizationId: org1.id,
    },
  });

  // Template 2: Kontrate Punesimi (2 pages)
  await prisma.signingTemplate.create({
    data: {
      name: "Kontrate Punesimi",
      description: "Template 2-faqesh per kontrata punesimi. Faqja 1: te dhenat e punonjesit dhe kushtet. Faqja 2: nenshkrimet dhe vula.",
      category: "punesim",
      fields: JSON.stringify([
        // Page 1: Employee details
        { type: "text", label: "Emri i Punonjesit", required: true, position: { page: 0, x: 85, y: 170, width: 300, height: 25 }, assignedTo: "1" },
        { type: "text", label: "Pozicioni", required: true, position: { page: 0, x: 85, y: 227, width: 300, height: 25 }, assignedTo: "1" },
        { type: "text", label: "Paga Mujore (ALL)", required: true, position: { page: 0, x: 85, y: 283, width: 200, height: 25 }, assignedTo: "2" },
        { type: "text", label: "Data e Fillimit", required: true, position: { page: 0, x: 340, y: 283, width: 170, height: 25 }, assignedTo: "2" },
        { type: "text", label: "Kushtet e Punes", required: true, position: { page: 0, x: 85, y: 368, width: 450, height: 300 }, assignedTo: "2" },
        // Page 2: Signatures
        { type: "checkbox", label: "Pranoj kushtet e kontrates", required: true, position: { page: 1, x: 85, y: 85, width: 20, height: 20 }, assignedTo: "1" },
        { type: "date", label: "Data e Nenshkrimit", required: true, position: { page: 1, x: 85, y: 481, width: 170, height: 25 }, assignedTo: "1" },
        { type: "signature", label: "Nenshkrimi Punonjesit", required: true, position: { page: 1, x: 85, y: 538, width: 200, height: 65 }, assignedTo: "1" },
        { type: "signature", label: "Nenshkrimi Punedhenesit", required: true, position: { page: 1, x: 340, y: 538, width: 200, height: 65 }, assignedTo: "2" },
      ]),
      signerRoles: JSON.stringify([
        { id: "1", name: "Punonjesi", color: "#dc2626" },
        { id: "2", name: "Punedhenesi", color: "#16a34a" },
      ]),
      pdfmeTemplate: pdfme([
        // Page 1
        [
          { name: "Emri i Punonjesit", type: "text", content: "", position: { x: 30, y: 60 }, width: 100, height: 8 },
          { name: "Pozicioni", type: "text", content: "", position: { x: 30, y: 80 }, width: 100, height: 8 },
          { name: "Paga Mujore (ALL)", type: "text", content: "", position: { x: 30, y: 100 }, width: 70, height: 8 },
          { name: "Data e Fillimit", type: "date", content: "", position: { x: 120, y: 100 }, width: 60, height: 8 },
          { name: "Kushtet e Punes", type: "text", content: "", position: { x: 15, y: 130 }, width: 180, height: 100, fontSize: 10 },
        ],
        // Page 2
        [
          { name: "Pranoj kushtet", type: "checkbox", content: "", position: { x: 15, y: 30 }, width: 8, height: 8 },
          { name: "Data e Nenshkrimit", type: "date", content: "", position: { x: 15, y: 170 }, width: 60, height: 8 },
          { name: "Nenshkrimi Punonjesit", type: "image", content: "", position: { x: 15, y: 190 }, width: 70, height: 25 },
          { name: "Nenshkrimi Punedhenesit", type: "image", content: "", position: { x: 120, y: 190 }, width: 70, height: 25 },
        ],
      ], 2),
      isPublic: true,
      usageCount: 23,
      userId: admin.id,
      organizationId: org1.id,
    },
  });

  // Template 3: NDA - Marreveshje Konfidencialiteti (1 page)
  await prisma.signingTemplate.create({
    data: {
      name: "NDA - Marreveshje Konfidencialiteti",
      description: "Marreveshje konfidencialiteti e thjeshte mes dy paleve me kohezgjatje dhe kushte specifike.",
      category: "marreveshje",
      fields: JSON.stringify([
        { type: "text", label: "Pala Zbuluese", required: true, position: { page: 0, x: 85, y: 170, width: 280, height: 25 }, assignedTo: "1" },
        { type: "text", label: "Pala Pranuese", required: true, position: { page: 0, x: 85, y: 227, width: 280, height: 25 }, assignedTo: "2" },
        { type: "text", label: "Kohezgjatja (muaj)", required: true, position: { page: 0, x: 85, y: 283, width: 142, height: 25 }, assignedTo: "1" },
        { type: "text", label: "Kushtet e Konfidencialitetit", required: true, position: { page: 0, x: 85, y: 368, width: 450, height: 200 }, assignedTo: "1" },
        { type: "date", label: "Data", required: true, position: { page: 0, x: 85, y: 623, width: 142, height: 25 }, assignedTo: "1" },
        { type: "signature", label: "Nenshkrim Pale 1", required: true, position: { page: 0, x: 85, y: 680, width: 200, height: 65 }, assignedTo: "1" },
        { type: "signature", label: "Nenshkrim Pale 2", required: true, position: { page: 0, x: 340, y: 680, width: 200, height: 65 }, assignedTo: "2" },
      ]),
      signerRoles: JSON.stringify([
        { id: "1", name: "Pala Zbuluese", color: "#dc2626" },
        { id: "2", name: "Pala Pranuese", color: "#7c3aed" },
      ]),
      pdfmeTemplate: pdfme([
        [
          { name: "Pala Zbuluese", type: "text", content: "", position: { x: 30, y: 60 }, width: 100, height: 8 },
          { name: "Pala Pranuese", type: "text", content: "", position: { x: 30, y: 80 }, width: 100, height: 8 },
          { name: "Kohezgjatja (muaj)", type: "text", content: "", position: { x: 30, y: 100 }, width: 50, height: 8 },
          { name: "Kushtet", type: "text", content: "", position: { x: 15, y: 130 }, width: 180, height: 70, fontSize: 10 },
          { name: "Data", type: "date", content: "", position: { x: 15, y: 220 }, width: 50, height: 8 },
          { name: "Nenshkrim Pale 1", type: "image", content: "", position: { x: 15, y: 235 }, width: 70, height: 25 },
          { name: "Nenshkrim Pale 2", type: "image", content: "", position: { x: 120, y: 235 }, width: 70, height: 25 },
        ],
      ], 1),
      isPublic: true,
      usageCount: 18,
      userId: admin.id,
      organizationId: org1.id,
    },
  });

  // Template 4: Marreveshje Kredie Bankare (3 pages, 3 signers)
  await prisma.signingTemplate.create({
    data: {
      name: "Marreveshje Kredie Bankare",
      description: "Template 3-faqesh per kredi bankare. Faqja 1: te dhenat e kredise. Faqja 2: kushtet. Faqja 3: nenshkrimet e 3 paleve.",
      category: "bankare",
      fields: JSON.stringify([
        // Page 1: Loan details
        { type: "text", label: "Emri i Klientit", required: true, position: { page: 0, x: 85, y: 170, width: 280, height: 25 }, assignedTo: "1" },
        { type: "text", label: "Shuma e Kredise (EUR)", required: true, position: { page: 0, x: 85, y: 255, width: 200, height: 25 }, assignedTo: "2" },
        { type: "text", label: "Afati (muaj)", required: true, position: { page: 0, x: 340, y: 255, width: 142, height: 25 }, assignedTo: "2" },
        { type: "text", label: "Norma e Interesit (%)", required: true, position: { page: 0, x: 85, y: 311, width: 142, height: 25 }, assignedTo: "2" },
        // Page 2: Terms
        { type: "text", label: "Kushtet e Kredise", required: true, position: { page: 1, x: 85, y: 113, width: 450, height: 500 }, assignedTo: "2" },
        // Page 3: Signatures
        { type: "date", label: "Data", required: true, position: { page: 2, x: 85, y: 340, width: 170, height: 25 }, assignedTo: "1" },
        { type: "signature", label: "Klienti", required: true, position: { page: 2, x: 28, y: 425, width: 170, height: 57 }, assignedTo: "1" },
        { type: "signature", label: "Banka", required: true, position: { page: 2, x: 218, y: 425, width: 170, height: 57 }, assignedTo: "2" },
        { type: "signature", label: "Garantuesi", required: true, position: { page: 2, x: 411, y: 425, width: 170, height: 57 }, assignedTo: "3" },
      ]),
      signerRoles: JSON.stringify([
        { id: "1", name: "Klienti", color: "#dc2626" },
        { id: "2", name: "Banka", color: "#047857" },
        { id: "3", name: "Garantuesi", color: "#d97706" },
      ]),
      pdfmeTemplate: pdfme([
        // Page 1: Loan details
        [
          { name: "Emri i Klientit", type: "text", content: "", position: { x: 30, y: 60 }, width: 100, height: 8 },
          { name: "Shuma e Kredise (EUR)", type: "text", content: "", position: { x: 30, y: 90 }, width: 70, height: 8 },
          { name: "Afati (muaj)", type: "text", content: "", position: { x: 120, y: 90 }, width: 50, height: 8 },
          { name: "Norma e Interesit (%)", type: "text", content: "", position: { x: 30, y: 110 }, width: 50, height: 8 },
        ],
        // Page 2: Terms
        [
          { name: "Kushtet e Kredise", type: "text", content: "", position: { x: 15, y: 40 }, width: 180, height: 180, fontSize: 10 },
        ],
        // Page 3: Signatures
        [
          { name: "Data", type: "date", content: "", position: { x: 15, y: 120 }, width: 60, height: 8 },
          { name: "Klienti", type: "image", content: "", position: { x: 10, y: 150 }, width: 60, height: 20 },
          { name: "Banka", type: "image", content: "", position: { x: 77, y: 150 }, width: 60, height: 20 },
          { name: "Garantuesi", type: "image", content: "", position: { x: 145, y: 150 }, width: 60, height: 20 },
        ],
      ], 3),
      isPublic: true,
      usageCount: 31,
      userId: user2.id,
      organizationId: org3.id,
    },
  });

  // Template 5: Prokure e Posacme (1 page)
  await prisma.signingTemplate.create({
    data: {
      name: "Prokure e Posacme",
      description: "Autorizim specifik per perfaqesim. 1 faqe me te dhenat e autorizuesit, te autorizuarit dhe objektin e prokures.",
      category: "prokure",
      fields: JSON.stringify([
        { type: "text", label: "Emri Autorizuesit", required: true, position: { page: 0, x: 85, y: 170, width: 280, height: 25 }, assignedTo: "1" },
        { type: "text", label: "Nr. ID / Pasaportes", required: true, position: { page: 0, x: 85, y: 227, width: 200, height: 25 }, assignedTo: "1" },
        { type: "text", label: "Emri te Autorizuarit", required: true, position: { page: 0, x: 85, y: 283, width: 280, height: 25 }, assignedTo: "1" },
        { type: "text", label: "Objekti i Prokures", required: true, position: { page: 0, x: 85, y: 368, width: 450, height: 170 }, assignedTo: "1" },
        { type: "date", label: "Data", required: true, position: { page: 0, x: 85, y: 595, width: 142, height: 25 }, assignedTo: "1" },
        { type: "signature", label: "Nenshkrimi Autorizuesit", required: true, position: { page: 0, x: 85, y: 650, width: 200, height: 65 }, assignedTo: "1" },
      ]),
      signerRoles: JSON.stringify([
        { id: "1", name: "Autorizuesi", color: "#dc2626" },
      ]),
      pdfmeTemplate: pdfme([
        [
          { name: "Emri Autorizuesit", type: "text", content: "", position: { x: 30, y: 60 }, width: 100, height: 8 },
          { name: "Nr. ID / Pasaportes", type: "text", content: "", position: { x: 30, y: 80 }, width: 70, height: 8 },
          { name: "Emri te Autorizuarit", type: "text", content: "", position: { x: 30, y: 100 }, width: 100, height: 8 },
          { name: "Objekti i Prokures", type: "text", content: "", position: { x: 15, y: 130 }, width: 180, height: 60, fontSize: 10 },
          { name: "Data", type: "date", content: "", position: { x: 15, y: 210 }, width: 50, height: 8 },
          { name: "Nenshkrimi Autorizuesit", type: "image", content: "", position: { x: 15, y: 225 }, width: 70, height: 25 },
        ],
      ], 1),
      isPublic: true,
      usageCount: 8,
      userId: admin.id,
      organizationId: org1.id,
    },
  });

  // Template 6: Kontrate Sigurimi Auto-Moto (2 pages, MAIF-style)
  await prisma.signingTemplate.create({
    data: {
      name: "Kontrate Sigurimi Auto-Moto",
      description: "Template 2-faqesh per sigurimin e automjeteve. Faqja 1: te dhenat e automjetit dhe kushtet. Faqja 2: nenshkrimet.",
      category: "kontrate",
      fields: JSON.stringify([
        // Page 1: Vehicle & policy details
        { type: "text", label: "Nr. Polices", required: true, position: { page: 0, x: 340, y: 85, width: 170, height: 25 }, assignedTo: "2" },
        { type: "text", label: "Emri i te Siguruarit", required: true, position: { page: 0, x: 85, y: 198, width: 280, height: 25 }, assignedTo: "1" },
        { type: "text", label: "Marka e Automjetit", required: true, position: { page: 0, x: 85, y: 283, width: 200, height: 25 }, assignedTo: "2" },
        { type: "text", label: "Targa", required: true, position: { page: 0, x: 340, y: 283, width: 142, height: 25 }, assignedTo: "2" },
        { type: "text", label: "Kushtet e Sigurimit", required: true, position: { page: 0, x: 85, y: 396, width: 450, height: 300 }, assignedTo: "2" },
        // Page 2: Signatures
        { type: "checkbox", label: "Pranoj kushtet e pergjithshme", required: true, position: { page: 1, x: 85, y: 85, width: 20, height: 20 }, assignedTo: "1" },
        { type: "date", label: "Data", required: true, position: { page: 1, x: 85, y: 340, width: 170, height: 25 }, assignedTo: "1" },
        { type: "signature", label: "I Siguruari", required: true, position: { page: 1, x: 85, y: 425, width: 200, height: 65 }, assignedTo: "1" },
        { type: "signature", label: "Siguruesi", required: true, position: { page: 1, x: 340, y: 425, width: 200, height: 65 }, assignedTo: "2" },
      ]),
      signerRoles: JSON.stringify([
        { id: "1", name: "I Siguruari", color: "#dc2626" },
        { id: "2", name: "Siguruesi", color: "#18181b" },
      ]),
      pdfmeTemplate: pdfme([
        // Page 1: Vehicle details
        [
          { name: "Nr. Polices", type: "text", content: "", position: { x: 120, y: 30 }, width: 70, height: 8 },
          { name: "Emri i te Siguruarit", type: "text", content: "", position: { x: 30, y: 70 }, width: 100, height: 8 },
          { name: "Marka e Automjetit", type: "text", content: "", position: { x: 30, y: 100 }, width: 70, height: 8 },
          { name: "Targa", type: "text", content: "", position: { x: 120, y: 100 }, width: 50, height: 8 },
          { name: "Kushtet e Sigurimit", type: "text", content: "", position: { x: 15, y: 140 }, width: 180, height: 100, fontSize: 10 },
        ],
        // Page 2: Signatures
        [
          { name: "Pranoj kushtet", type: "checkbox", content: "", position: { x: 15, y: 30 }, width: 8, height: 8 },
          { name: "Data", type: "date", content: "", position: { x: 15, y: 120 }, width: 60, height: 8 },
          { name: "I Siguruari", type: "image", content: "", position: { x: 15, y: 150 }, width: 70, height: 25 },
          { name: "Siguruesi", type: "image", content: "", position: { x: 120, y: 150 }, width: 70, height: 25 },
        ],
      ], 2),
      isPublic: true,
      usageCount: 156,
      userId: maifUser.id,
      organizationId: org5.id,
    },
  });

  console.log("  Signing templates created (6 pdfme-based)");

  // ==================== Signing Requests ====================
  await prisma.signingRequest.create({
    data: {
      status: "COMPLETED",
      recipientEmails: JSON.stringify(["elira@bkt.com.al", "daniel@doc.al"]),
      message: "Ju lutem nenshkruani kontraten e bashkepunimit",
      documentId: documents[0].id,
      requesterId: admin.id,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.signingRequest.create({
    data: {
      status: "PENDING",
      recipientEmails: JSON.stringify(["arben@drejtesia.gov.al", "gjyqtar@drejtesia.gov.al"]),
      message: "Vendimi per ceshtjen nr. 1234/2026",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      documentId: documents[2].id,
      requesterId: user1.id,
    },
  });

  await prisma.signingRequest.create({
    data: {
      status: "IN_PROGRESS",
      recipientEmails: JSON.stringify(["besnik@gmail.com"]),
      message: "Prokura per perfaqesim",
      documentId: documents[3].id,
      requesterId: admin.id,
    },
  });

  await prisma.signingRequest.create({
    data: {
      status: "PENDING",
      recipientEmails: JSON.stringify(["kandidat@gmail.com", "daniel@doc.al"]),
      message: "Kontrate punesimi per pozicionin IT Developer",
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      documentId: documents[5].id,
      requesterId: admin.id,
    },
  });

  // GigBook API-generated signing requests
  await prisma.signingRequest.create({
    data: {
      status: "PENDING",
      recipientEmails: JSON.stringify(["artisti@gmail.com", "venue@tirana.al"]),
      message: "Kontrate rezervimi per eventin e dates 15 Prill 2026",
      companyName: "GigBook",
      brandColor: "#7c3aed",
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      documentId: documents[12].id,
      requesterId: gigbookApi.id,
    },
  });

  await prisma.signingRequest.create({
    data: {
      status: "COMPLETED",
      recipientEmails: JSON.stringify(["band@muzika.al", "menaxher@gigbook.al"]),
      message: "Kontrate sherbimi per koncert live ne Korce",
      companyName: "GigBook",
      brandColor: "#7c3aed",
      documentId: documents[13].id,
      requesterId: gigbookApi.id,
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  // MAIF-style signing request
  await prisma.signingRequest.create({
    data: {
      status: "PENDING",
      recipientEmails: JSON.stringify(["daniel@doc.al"]),
      message: "Ju ftojme te nenshkruani dokumentet tuaja te sigurimit. Eshte thelbesome per te perfunduar abonimin.",
      companyName: "MAIF Albania",
      brandColor: "#dc2626",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      documentId: documents[14].id,
      requesterId: maifUser.id,
    },
  });

  await prisma.signingRequest.create({
    data: {
      status: "COMPLETED",
      recipientEmails: JSON.stringify(["daniel@doc.al", "agent@maif.al"]),
      message: "Kushtet e pergjithshme te sigurimit VAM",
      companyName: "MAIF Albania",
      brandColor: "#dc2626",
      documentId: documents[15].id,
      requesterId: maifUser.id,
      completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("  Signing requests created (8)");

  // ==================== Audit Log ====================
  const actions = [
    { action: "USER_LOGIN", entityType: "User", userId: admin.id },
    { action: "DOCUMENT_UPLOAD", entityType: "Document", userId: admin.id },
    { action: "SIGNATURE_CREATED", entityType: "Signature", userId: admin.id },
    { action: "TIMESTAMP_CREATED", entityType: "TimestampEntry", userId: admin.id },
    { action: "USER_LOGIN", entityType: "User", userId: user1.id },
    { action: "DOCUMENT_UPLOAD", entityType: "Document", userId: user1.id },
    { action: "CERTIFICATE_GENERATED", entityType: "Certificate", userId: admin.id },
    { action: "SIGNATURE_SIGNED", entityType: "Signature", userId: user2.id },
    { action: "API_KEY_CREATED", entityType: "ApiKey", userId: apiUser.id },
    { action: "KYC_VERIFIED", entityType: "User", userId: user1.id },
    { action: "USER_LOGIN", entityType: "User", userId: user2.id },
    { action: "DOCUMENT_UPLOAD", entityType: "Document", userId: user2.id },
    { action: "TEMPLATE_CREATED", entityType: "SigningTemplate", userId: admin.id },
    { action: "SIGNING_REQUEST_SENT", entityType: "SigningRequest", userId: admin.id },
    { action: "SIGNATURE_SIGNED", entityType: "Signature", userId: user1.id },
    { action: "USER_REGISTER", entityType: "User", userId: user3.id },
    { action: "USER_LOGIN", entityType: "User", userId: user4.id },
    { action: "DOCUMENT_UPLOAD", entityType: "Document", userId: user4.id },
    { action: "BTC_CONFIRMATION", entityType: "TimestampEntry", userId: null },
    { action: "CRL_UPDATED", entityType: "Certificate", userId: null },
    { action: "API_SIGNING_REQUEST_CREATED", entityType: "SigningRequest", userId: gigbookApi.id },
    { action: "API_SIGNING_REQUEST_CREATED", entityType: "SigningRequest", userId: gigbookApi.id },
    { action: "CERTIFICATE_RENEWAL_CHECK", entityType: "Certificate", userId: null },
    { action: "SIGNING_REQUEST_SENT", entityType: "SigningRequest", userId: maifUser.id },
  ];

  for (let i = 0; i < actions.length; i++) {
    await prisma.auditLog.create({
      data: {
        action: actions[i].action,
        entityType: actions[i].entityType,
        entityId: `entity-${i}`,
        ipAddress: `192.168.1.${10 + (i % 50)}`,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        metadata: JSON.stringify({ detail: `Seed data entry ${i + 1}` }),
        createdAt: new Date(Date.now() - (actions.length - i) * 3600 * 1000),
        userId: actions[i].userId,
      },
    });
  }

  console.log("  Audit log entries created (24)");

  // ==================== Contact Requests ====================
  await prisma.contactRequest.create({
    data: {
      companyName: "Vodafone Albania",
      contactName: "Enis Rama",
      email: "enis@vodafone.al",
      phone: "+355694567890",
      position: "CTO",
      employees: "500+",
      industry: "Telekomunikacion",
      documentsPerMonth: "1000+",
      needsCertificateAuthority: true,
      needsApiIntegration: true,
      needsWhiteLabel: true,
      needsCustomTemplates: true,
      message: "Kerkojme nje zgjidhje te plote per nenshkrime elektronike me API integration.",
      status: "NEW",
    },
  });

  await prisma.contactRequest.create({
    data: {
      companyName: "Digitalb",
      contactName: "Mira Leka",
      email: "mira@digitalb.al",
      phone: "+355695678901",
      position: "Drejtor Juridik",
      employees: "200-500",
      industry: "Media",
      documentsPerMonth: "200-500",
      needsCertificateAuthority: false,
      needsApiIntegration: true,
      needsCustomTemplates: true,
      message: "Na intereson integrimi me platformen tone per kontrata me abonente.",
      status: "CONTACTED",
    },
  });

  console.log("  Contact requests created (2)");

  // ==================== Summary ====================
  console.log("\n========================================");
  console.log("  SEED COMPLETE!");
  console.log("========================================\n");
  console.log("  TEST ACCOUNTS:");
  console.log("  ─────────────────────────────────────");
  console.log("  SUPER ADMIN:");
  console.log("    Email:    admin@doc.al");
  console.log("    Password: password123");
  console.log("    Role:     SUPER_ADMIN");
  console.log("    Org:      Doc.al Solutions");
  console.log("");
  console.log("  ADMIN:");
  console.log("    Email:    daniel@doc.al");
  console.log("    Password: password123");
  console.log("    Role:     ADMIN");
  console.log("    Org:      Doc.al Solutions");
  console.log("");
  console.log("  USERS:");
  console.log("    arben@drejtesia.gov.al  | VERIFIED | Ministria e Drejtesise");
  console.log("    elira@bkt.com.al        | VERIFIED | Banka Kombetare Tregtare");
  console.log("    besnik@gmail.com        | PENDING  | -");
  console.log("    teuta@yahoo.com         | VERIFIED | -");
  console.log("");
  console.log("  API USERS:");
  console.log("    api@doc.al              | Doc.al Solutions");
  console.log("    api@gigbook.al          | GigBook Platform");
  console.log("    agent@maif.al           | MAIF Assurance Albania");
  console.log("");
  // ==================== Legal Bases ====================
  console.log("Creating legal bases...");

  await prisma.legalBasis.createMany({
    data: [
      {
        title: "Kodi i Punes i Republikes se Shqiperise",
        lawReference: "Ligji Nr. 7961, dt. 12.07.1995 (i ndryshuar)",
        description: "Rregullon marredheniet e punes ndermjet punedhenesit dhe punemarresit, perfshire kontratat e punes, kushtet, te drejtat dhe detyrimet e paleve, pushimin nga puna, sigurine ne pune dhe zgjidhjen e mosmarreveshjeve.",
        suggestedTerms: "<h2>Kushtet e Kontrates se Punes</h2><p>Ne baze te Kodit te Punes te Republikes se Shqiperise (Ligji Nr. 7961):</p><h3>Neni 1 - Objekti i Kontrates</h3><p>Punemarresi do te kryeje detyrat e pozicionit <strong>[pozicioni]</strong> ne perputhje me pershkrimin e punes te bashkelidhur.</p><h3>Neni 2 - Kohezgjatja</h3><p>Kjo kontrate lidhet per nje periudhe <strong>[te pacaktuar / te caktuar prej ___ muajsh]</strong>, duke filluar nga data <strong>[data e fillimit]</strong>.</p><h3>Neni 3 - Paga dhe Perftimet</h3><p>Paga mujore bruto eshte <strong>[shuma] LEK</strong>, e pagueshme brenda dates 5 te cdo muaji. Punemarresi perfiton sigurime shoqerore dhe shendetesore sipas legjislacionit ne fuqi.</p><h3>Neni 4 - Orari i Punes</h3><p>Orari i punes eshte 40 ore ne jave, nga e Hena ne te Premte, ora 08:00 - 16:30 me pushim dreke 30 minuta.</p><h3>Neni 5 - Pushimet Vjetore</h3><p>Punemarresi ka te drejte per <strong>[20]</strong> dite pune pushime vjetore te paguara.</p><h3>Neni 6 - Periudha e Proves</h3><p>Periudha e proves eshte <strong>[3 muaj]</strong> gjate se ciles secila pale mund te zgjidhe kontraten me njoftim <strong>[5 dite]</strong> pune.</p><h3>Neni 7 - Zgjidhja e Kontrates</h3><p>Secila pale mund te zgjidhe kontraten me njoftim paraprak prej <strong>[1 muaji]</strong>. Zgjidhja pa njoftim lejohet vetem per shkelje te renda sipas Nenit 153 te Kodit te Punes.</p>",
        category: "employment",
        isActive: true,
        sortOrder: 1,
      },
      {
        title: "Kodi Civil i Republikes se Shqiperise",
        lawReference: "Ligji Nr. 7850, dt. 29.07.1994 (i ndryshuar)",
        description: "Rregullon marredheniet juridike civile, perfshire kontratat, detyrimet, pronesine, trashegimine dhe pergjegjesine civile. Sherben si baze ligjore per te gjitha kontratat tregtare dhe civile.",
        suggestedTerms: "<h2>Kushtet e Pergjithshme te Kontrates</h2><p>Ne baze te Kodit Civil te Republikes se Shqiperise (Ligji Nr. 7850):</p><h3>Neni 1 - Palet Kontraktuese</h3><p>Kjo kontrate lidhet ndermjet paleve te identifikuara me siper, te cilat kane kapacitetin e plote juridik per te hyre ne kete marreveshje.</p><h3>Neni 2 - Objekti</h3><p>Objekti i kesaj kontrate eshte <strong>[pershkruani objektin]</strong>.</p><h3>Neni 3 - Cmimi dhe Pagesa</h3><p>Cmimi total i kesaj marreveshjeje eshte <strong>[shuma] LEK</strong>, i pagueshmi sipas grafikut te meposhtem: <strong>[detajet e pageses]</strong>.</p><h3>Neni 4 - Afati</h3><p>Kjo kontrate hyn ne fuqi nga data e nenshkrimit dhe eshte e vlefshme deri me <strong>[data e perfundimit]</strong>.</p><h3>Neni 5 - Pergjegjesie</h3><p>Pala qe nuk permbush detyrimet kontraktore mban pergjegjesi sipas dispozitave te Kodit Civil dhe i detyrohet pales tjeter demshperblimit.</p><h3>Neni 6 - Forca Madhore</h3><p>Asnjera pale nuk mban pergjegjesi per mospermbushjen e detyrimeve ne rast te forces madhore, sipas Nenit 478 te Kodit Civil.</p><h3>Neni 7 - Zgjidhja e Mosmarreveshjeve</h3><p>Cdo mosmarreveshje qe lind nga kjo kontrate do te zgjidhet fillimisht me mirekuptim. Ne rast te deshtueshmerise, palet do t'i drejtohen Gjykates Kompetente.</p>",
        category: "general",
        isActive: true,
        sortOrder: 2,
      },
      {
        title: "Ligji per Qirate",
        lawReference: "Nenet 801-849, Kodi Civil (Ligji Nr. 7850)",
        description: "Rregullon marredheniet e qirase per pasurite e paluajtshme, perfshire te drejtat e qiramerresit dhe qiradhinesit, kushtet e kontrates, afatet, mirebajtjen, nderprerjen e kontrates dhe detyrimet financiare.",
        suggestedTerms: "<h2>Kontrate Qiraje</h2><p>Ne baze te neneve 801-849 te Kodit Civil:</p><h3>Neni 1 - Objekti i Qirase</h3><p>Qiradhenes i jep me qira Qiramerresit ambjentet e ndodhura ne adresen: <strong>[adresa e plote]</strong>, me siperfaqe totale <strong>[m2]</strong>.</p><h3>Neni 2 - Afati i Qirase</h3><p>Kontrata e qirase lidhet per periudhen nga <strong>[data e fillimit]</strong> deri me <strong>[data e mbarimit]</strong>, me mundesi rinovimi me marreveshje te ndersjellet.</p><h3>Neni 3 - Qiraja Mujore</h3><p>Qiraja mujore eshte <strong>[shuma] LEK/EUR</strong>, e pagueshme brenda dates <strong>[5]</strong> te cdo muaji ne llogarine bankare te Qiradhinesit.</p><h3>Neni 4 - Depozita</h3><p>Qiramerres depoziton shumen e <strong>[shuma]</strong> si garanci, e kthyeshme ne perfundim te kontrates pas verifikimit te gjendjes se ambienteve.</p><h3>Neni 5 - Mirebajtja</h3><p>Qiramerres merr persiper mirebajtjen e perditshme. Riparime te medha jane ne ngarkim te Qiradhinesit.</p><h3>Neni 6 - Nderprerja</h3><p>Secila pale mund te nderprese kontraten me njoftim paraprak <strong>[30 dite]</strong> me shkrim.</p>",
        category: "rental",
        isActive: true,
        sortOrder: 3,
      },
      {
        title: "Ligji per Tregtaret dhe Shoqerite Tregtare",
        lawReference: "Ligji Nr. 9901, dt. 14.04.2008 (i ndryshuar)",
        description: "Rregullon veprimtarine tregtare, regjistrimin e shoqerive, marredheniet ndermjet ortakeve, kontratat tregtare, shitblerjet, furnizimin, agjensine, francizen dhe bashkepunimet tregtare.",
        suggestedTerms: "<h2>Kontrate Bashkepunimi Tregtar</h2><p>Ne baze te Ligjit Nr. 9901 per Tregtaret dhe Shoqerite Tregtare:</p><h3>Neni 1 - Objekti i Bashkepunimit</h3><p>Palet bien dakord per bashkepunim ne fushen e <strong>[fusha]</strong>, sipas kushteve te percaktuara ne kete kontrate.</p><h3>Neni 2 - Detyrimet e Paleve</h3><p><strong>Pala e Pare</strong> merr persiper: <strong>[detyrimet]</strong>.</p><p><strong>Pala e Dyte</strong> merr persiper: <strong>[detyrimet]</strong>.</p><h3>Neni 3 - Kushtet Financiare</h3><p>Vlera totale e kontrates eshte <strong>[shuma] LEK</strong>. Pagesat kryhen sipas grafikut: <strong>[detajet]</strong>.</p><h3>Neni 4 - Konfidencialiteti</h3><p>Palet angazhohen te ruajne konfidencialitetin e informacionit tregtar per nje periudhe <strong>[2 vjet]</strong> pas perfundimit te kontrates.</p><h3>Neni 5 - Pronesia Intelektuale</h3><p>Cdo prodhim intelektual i krijuar gjate bashkepunimit i perket <strong>[pales / te dyja paleve ne perpjestim te barabarte]</strong>.</p>",
        category: "commercial",
        isActive: true,
        sortOrder: 4,
      },
      {
        title: "Ligji per Mbrojtjen e te Dhenave Personale",
        lawReference: "Ligji Nr. 9887, dt. 10.03.2008 (i ndryshuar)",
        description: "Rregullon perpunimin e te dhenave personale, te drejtat e subjekteve te te dhenave, detyrimet e kontrolloreve dhe perpunuesve, transferimin nderkombetar te te dhenave dhe masat e sigurise. I harmonizuar me GDPR te BE-se.",
        suggestedTerms: "<h2>Klauzola e Mbrojtjes se te Dhenave Personale</h2><p>Ne baze te Ligjit Nr. 9887 per Mbrojtjen e te Dhenave Personale:</p><h3>Neni - Perpunimi i te Dhenave</h3><p>Palet bien dakord qe te dhenat personale te perpunuara ne kuader te kesaj kontrate do te trajtohen ne perputhje te plote me Ligjin Nr. 9887 dhe Rregulloren e Pergjithshme te Mbrojtjes se te Dhenave (GDPR).</p><h3>Neni - Qellimi i Perpunimit</h3><p>Te dhenat personale perpunohen vetem per qellimin e <strong>[qellimi]</strong> dhe nuk do te perdoren per asnje qellim tjeter pa pelqimin e subjektit.</p><h3>Neni - Masat e Sigurise</h3><p>Palet marrin masat teknike dhe organizative te pershtatshme per te siguruar mbrojtjen e te dhenave personale nga humbja, shkaterrimi, ndryshimi ose aksesi i paautorizuar.</p><h3>Neni - Te Drejtat e Subjektit</h3><p>Subjektet e te dhenave kane te drejten e aksesit, korrigjimit, fshirjes dhe kufizimit te perpunimit te te dhenave te tyre personale.</p>",
        category: "data_protection",
        isActive: true,
        sortOrder: 5,
      },
      {
        title: "Ligji per Nenshkrimin Elektronik",
        lawReference: "Ligji Nr. 9880, dt. 25.02.2008 (i ndryshuar)",
        description: "Rregullon perdorimin e nenshkrimeve elektronike, certifikatave dixhitale, ofruesve te sherbimeve te certifikuara dhe vlefshmerine ligjore te dokumenteve elektronike. I harmonizuar me Rregulloren eIDAS te BE-se.",
        suggestedTerms: "<h2>Klauzola e Nenshkrimit Elektronik</h2><p>Ne baze te Ligjit Nr. 9880 per Nenshkrimin Elektronik dhe Rregullores eIDAS:</p><h3>Neni - Vlefshmerine e Nenshkrimit Elektronik</h3><p>Palet pranojne qe nenshkrimi elektronik i avancuar i perdorur ne kete kontrate ka te njejten vlere juridike si nenshkrimi doreskrimi, ne perputhje me Nenin 6 te Ligjit Nr. 9880.</p><h3>Neni - Pelqimi per Nenshkrimin Elektronik</h3><p>Duke nenshkruar elektronikisht kete dokument, secila pale deklaron se ka lexuar, kuptuar dhe pranuar te gjitha kushtet e kontrates. Nenshkrimi elektronik perben shprehje te vullnetit te lire te paleve.</p><h3>Neni - Ruajtja e Dokumentit</h3><p>Dokumenti i nenshkruar ruhet ne menyre dixhitale me verifikim hash kriptografik. Palet mund te verifikojne autenticitetin ne cdo kohe nepermjet platformes DOC.al.</p>",
        category: "digital",
        isActive: true,
        sortOrder: 6,
      },
      {
        title: "Ligji per Prokurimin Publik",
        lawReference: "Ligji Nr. 162/2020, dt. 23.12.2020",
        description: "Rregullon procedurat e prokurimit publik per blerjen e mallrave, sherbimeve dhe puneve nga autoritetet kontraktore. Percakton parimet e transparences, konkurrences se ndershme, barazise se trajtimit dhe efikasitetit ne shpenzimin e fondeve publike.",
        suggestedTerms: "<h2>Kushtet e Kontrates se Prokurimit</h2><p>Ne baze te Ligjit Nr. 162/2020 per Prokurimin Publik:</p><h3>Neni 1 - Objekti i Prokurimit</h3><p>Autoriteti kontraktor bie dakord te bleje nga operatori ekonomik <strong>[pershkrimi i mallrave/sherbimeve/puneve]</strong> sipas specifikimeve teknike te bashkelidhura.</p><h3>Neni 2 - Vlera e Kontrates</h3><p>Vlera totale e kontrates eshte <strong>[shuma] LEK</strong> (pa TVSH), e percaktuar sipas ofertes fituese te dates <strong>[data]</strong>.</p><h3>Neni 3 - Afati i Dorëzimit</h3><p>Operatori ekonomik detyrohet te dorezoje mallrat/kryeje sherbimet brenda <strong>[numri] diteve</strong> kalendarike nga data e nenshkrimit te kontrates.</p><h3>Neni 4 - Garancia e Kontrates</h3><p>Operatori ekonomik ka depozituar garanci te permbushjes se kontrates ne vleren <strong>[5-10]%</strong> te vleres se kontrates, e vlefshme deri ne perfundimin e detyrimeve kontraktore.</p><h3>Neni 5 - Penalitetet</h3><p>Per cdo dite vonese ne permbushje, operatori ekonomik i nenshtrohet nje penaliteti prej <strong>[0.5]%</strong> te vleres se kontrates, deri ne maksimumin <strong>[10]%</strong>.</p><h3>Neni 6 - Pranimit i Mallit/Sherbimit</h3><p>Pranimi behet nga komisioni i pranimit brenda <strong>[5]</strong> diteve pune nga data e dorëzimit, me proces-verbal te nenshkruar nga te dyja palet.</p>",
        category: "procurement",
        isActive: true,
        sortOrder: 7,
      },
      {
        title: "Ligji per Marredheniet e Detyrimit",
        lawReference: "Nenet 419-477, Kodi Civil (Ligji Nr. 7850)",
        description: "Rregullon marredheniet e detyrimit qe lindin nga kontratat, duke perfshire kushtet e vlefshmerise, permbushjen, mospermbushjen, demshperblimin, kamatat, parashkrimin dhe garantimin e detyrimeve.",
        suggestedTerms: "<h2>Kushtet e Detyrimit Kontraktor</h2><p>Ne baze te neneve 419-477 te Kodit Civil:</p><h3>Neni 1 - Permbushja e Detyrimit</h3><p>Debitori detyrohet te permbushe detyrimin sipas kushteve te percaktuara ne kete kontrate, ne kohen dhe vendin e caktuar.</p><h3>Neni 2 - Kamatat e Voneses</h3><p>Ne rast te voneses ne pagese, debitori do te paguaje kamata ligjore ne masen <strong>[rata e BQ + 2%]</strong> ne vit mbi shumen e papaguar, duke filluar nga data e afatit.</p><h3>Neni 3 - Demshperblimi</h3><p>Pala qe shkakton dem per mospermbushje te detyrimit i detyrohet demshperblimit te plote pales se demtuar, duke perfshire demin real dhe fitimin e munguar.</p><h3>Neni 4 - Kompensimi</h3><p>Nese palet kane detyrime reciproke te njejtes natyre, ato mund te kompensohen automatikisht deri ne masen e detyrimit me te vogel.</p><h3>Neni 5 - Parashkrimi</h3><p>Te drejtat qe rrjedhin nga kjo kontrate parashkruhen brenda <strong>[5]</strong> vjeteve nga data kur ato mund te ushtrohen, sipas Nenit 110 te Kodit Civil.</p>",
        category: "general",
        isActive: true,
        sortOrder: 8,
      },
      {
        title: "Ligji per Shitblerjen",
        lawReference: "Nenet 705-758, Kodi Civil (Ligji Nr. 7850)",
        description: "Rregullon kontratat e shitblerjes se sendeve te luajtshme dhe te paluajtshme, perfshire te drejtat e bleresit dhe shitesit, garancine, dorezimin, kalimin e rrezikut dhe anulimet e kontrates se shitjes.",
        suggestedTerms: "<h2>Kontrate Shitblerjeje</h2><p>Ne baze te neneve 705-758 te Kodit Civil:</p><h3>Neni 1 - Objekti i Shitjes</h3><p>Shitesi i shet Bleresit <strong>[pershkrimi i mallit/prones]</strong> i cili ndodhet ne <strong>[vendndodhja]</strong>, ne gjendjen aktuale.</p><h3>Neni 2 - Cmimi i Shitjes</h3><p>Cmimi total i shitjes eshte <strong>[shuma] LEK/EUR</strong>, i pagueshmi si me poshte:<br/>- <strong>[shuma]</strong> ne momentin e nenshkrimit te kontrates<br/>- <strong>[shuma]</strong> brenda <strong>[numri]</strong> diteve nga data e dorezimit</p><h3>Neni 3 - Dorezimi</h3><p>Dorezimi i mallit/prones behet me <strong>[date dorezimi]</strong> ne <strong>[vend dorezimi]</strong>. Shpenzimet e transportit/transferimit jane ne ngarkim te <strong>[pales]</strong>.</p><h3>Neni 4 - Garancite e Shitesit</h3><p>Shitesi garanton qe sendi eshte ne pronesine e tij te plote, i lire nga cdo barre ose pretendim i te treteve, dhe nuk ka te meta te fshehura.</p><h3>Neni 5 - Kalimi i Rrezikut</h3><p>Rreziku i humbjés ose demtimit te sendit kalon tek Bleresi ne momentin e dorezimit fizik.</p><h3>Neni 6 - Te Metat e Fshehura</h3><p>Bleresi ka te drejte te kerkoje ulje cmimi ose anulim te kontrates nese zbulon te meta te fshehura brenda <strong>[6 muajve]</strong> nga dorezimi, sipas Nenit 726 te Kodit Civil.</p>",
        category: "commercial",
        isActive: true,
        sortOrder: 9,
      },
      {
        title: "Ligji per Mbrojtjen e Konsumatorit",
        lawReference: "Ligji Nr. 9902, dt. 17.04.2008 (i ndryshuar)",
        description: "Mbron te drejtat e konsumatoreve ne marredheniet me tregtaret, perfshire te drejten e informimit, te drejten e heqjes dore, garancine ligjore, praktikat e padrejta tregtare dhe zgjidhjen e mosmarreveshjeve te konsumit.",
        suggestedTerms: "<h2>Kushtet per Mbrojtjen e Konsumatorit</h2><p>Ne baze te Ligjit Nr. 9902 per Mbrojtjen e Konsumatorit:</p><h3>Neni 1 - E Drejta e Informimit</h3><p>Tregtari garanton qe konsumatorit i eshte dhene informacion i plote, i qarte dhe i sakte per produktin/sherbimin, perfshire cmimin total, karakteristikat kryesore dhe kushtet e garancise.</p><h3>Neni 2 - E Drejta e Heqjes Dore</h3><p>Per kontratat ne distance ose jashte ambienteve tregtare, konsumatori ka te drejte te heqe dore nga kontrata brenda <strong>[14]</strong> diteve kalendarike pa dhene arsye dhe pa asnje kosto shtese.</p><h3>Neni 3 - Garancia Ligjore</h3><p>Produkti mbulohet nga garancia ligjore prej <strong>[2]</strong> vjetesh nga data e blerjes. Ne rast defekti, konsumatori ka te drejte per riparim, zevendesim, ulje cmimi ose kthim te plote te shumes.</p><h3>Neni 4 - Kthimi i Produktit</h3><p>Ne rast te ushtrimit te se drejtes se heqjes dore, tregtari detyrohet te ktheje pagesen brenda <strong>[14]</strong> diteve nga marrja e njoftimit, duke perdorur te njejten metode pagese.</p><h3>Neni 5 - Ankimat</h3><p>Konsumatori mund te paraqese ankese me shkrim ne adresat e kontaktit te tregtarit. Tregtari detyrohet te pergjigjet brenda <strong>[15]</strong> diteve pune.</p>",
        category: "consumer",
        isActive: true,
        sortOrder: 10,
      },
      {
        title: "Ligji per te Drejten e Autorit",
        lawReference: "Ligji Nr. 35/2016, dt. 31.03.2016",
        description: "Mbron te drejtat e autorit dhe te drejtat e lidhura me to, perfshire veprat letrare, artistike, muzikore, audiovizuale, programet kompjuterike dhe bazat e te dhenave. Percakton transferimin e te drejtave, licencat dhe masat ndaj shkeljeve.",
        suggestedTerms: "<h2>Kushtet per te Drejten e Autorit</h2><p>Ne baze te Ligjit Nr. 35/2016 per te Drejten e Autorit:</p><h3>Neni 1 - Pronesia e Vepres</h3><p>Te gjitha te drejtat e autorit mbi vepren <strong>[pershkrimi i vepres]</strong> i perkasin <strong>[emri i autorit/pales]</strong>.</p><h3>Neni 2 - Licencimi</h3><p>Autori i jep licensmarresi te drejten <strong>[ekskluzive / joekskluzive]</strong> per te perdorur vepren per qellimin e <strong>[qellimi]</strong>, per nje periudhe <strong>[kohezgjatja]</strong>.</p><h3>Neni 3 - Kompensimi</h3><p>Per perdorimin e vepres, licencmarresi i paguan autorit:<br/>- Tarife fikse: <strong>[shuma] LEK</strong>, ose<br/>- Royalty: <strong>[perqindja]%</strong> e te ardhurave</p><h3>Neni 4 - Te Drejtat Morale</h3><p>Autori ruan te drejten e atribuimit (te permendet si autor) dhe te drejten e integriteti te vepres ne cdo rast.</p><h3>Neni 5 - Ndalimi i Riperdorimit</h3><p>Licencmarresi nuk ka te drejte te nenlicencoje, modifikoje ose shperndaje vepren pa miratimin paraprak me shkrim te autorit.</p>",
        category: "intellectual_property",
        isActive: true,
        sortOrder: 11,
      },
      {
        title: "Ligji per Arbitrazhin",
        lawReference: "Ligji Nr. 9090, dt. 26.06.2003 (i ndryshuar)",
        description: "Rregullon zgjidhjen e mosmarreveshjeve tregtare dhe civile nepermjet arbitrazhit, si alternative ndaj gjykates. Percakton marreveshjen e arbitrazhit, proceduren, vendimin arbitral dhe njohjen e zbatimin e vendimeve te huaja arbitrale.",
        suggestedTerms: "<h2>Klauzola e Arbitrazhit</h2><p>Ne baze te Ligjit Nr. 9090 per Arbitrazhin:</p><h3>Neni - Marreveshja e Arbitrazhit</h3><p>Cdo mosmarreveshje qe lind ose lidhet me kete kontrate do te zgjidhet perfundimisht nga arbitrazhi, sipas rregullave te <strong>[Dhoma e Tregtise dhe Industrise Tirane / ICC / UNCITRAL]</strong>.</p><h3>Neni - Perberja e Tribunalit</h3><p>Tribunali arbitral do te perbehe nga <strong>[1 / 3]</strong> arbitrer. Ne rastin e tre arbitrave, secila pale emeron nje arbitrer dhe arbitrat e emeruar zgjedhin kryesuesin.</p><h3>Neni - Vendi i Arbitrazhit</h3><p>Vendi i arbitrazhit eshte <strong>[Tirane, Shqiperi]</strong>. Gjuha e procedures eshte <strong>[shqipe / angleze]</strong>.</p><h3>Neni - Ligji i Zbatueshem</h3><p>Mosmarreveshja do te zgjidhet sipas ligjit te Republikes se Shqiperise.</p><h3>Neni - Vendimi Perfundimtar</h3><p>Vendimi arbitral eshte perfundimtar dhe i detyrueshem per te dyja palet. Palet heqin dore nga e drejta e ankimit ne gjykate, pervec rasteve te parashikuara shprehimisht ne Ligjin Nr. 9090.</p>",
        category: "dispute_resolution",
        isActive: true,
        sortOrder: 12,
      },
      {
        title: "Ligji per Sigurimet Shoqerore dhe Shendetesore",
        lawReference: "Ligji Nr. 7703, dt. 11.05.1993 (i ndryshuar)",
        description: "Rregullon sistemin e sigurimeve shoqerore dhe shendetesore ne Shqiperi, perfshire kontributet e punedhenesit dhe punemarresit, perftimet (pension, papunesi, barrëlindje, aksidente pune), kushtet e pensionit dhe te drejtat e perfitimit.",
        suggestedTerms: "<h2>Kushtet e Sigurimeve</h2><p>Ne baze te Ligjit Nr. 7703 per Sigurimet Shoqerore:</p><h3>Neni - Detyrimet per Sigurimet</h3><p>Punedhenesi detyrohet te paguaje kontributet e sigurimeve shoqerore dhe shendetesore sipas normave ne fuqi, si me poshte:</p><ul><li>Kontributi i Punedhenesit: <strong>[16.7]%</strong> e pages bruto</li><li>Kontributi i Punemarresit: <strong>[11.2]%</strong> e pages bruto</li><li>Sigurim Shendetesor: <strong>[3.4]%</strong> (1.7% secila pale)</li></ul><h3>Neni - Afati i Pageses</h3><p>Kontributet paguhen brenda dates <strong>[20]</strong> te muajit pasardhes, ne llogarine e ISSH/FSDKSH.</p><h3>Neni - Aksidentet ne Pune</h3><p>Ne rast aksidenti ne pune, punedhenesi detyrohet te njoftoje menjehere ISSH-ne dhe te mbuloje te gjitha shpenzimet mjekesore deri ne percaktimin e pergjegjesis sipas ligjit.</p>",
        category: "employment",
        isActive: true,
        sortOrder: 13,
      },
      {
        title: "Ligji per Ndertimin",
        lawReference: "Ligji Nr. 8402, dt. 10.09.1998 (i ndryshuar)",
        description: "Rregullon veprimtarine e ndertimit, perfshire lejet e ndertimit, kontratat e sipermarrjes, pergjegjesite e ndertuesit, mbikqyrjen, kolaudimin dhe garancine strukturore te ndertesave.",
        suggestedTerms: "<h2>Kontrate Sipermarrje Ndertimi</h2><p>Ne baze te Ligjit Nr. 8402 per Ndertimin:</p><h3>Neni 1 - Objekti i Punimeve</h3><p>Sipermarresi merr persiper realizimin e punimeve te ndertimit per <strong>[pershkrimi i objektit]</strong>, ne adresen <strong>[adresa]</strong>, sipas projektit teknik te miratuar.</p><h3>Neni 2 - Vlera e Kontrates</h3><p>Vlera totale e punimeve eshte <strong>[shuma] LEK</strong> (pa TVSH), e ndare sipas preventivit te bashkelidhur.</p><h3>Neni 3 - Afati i Realizimit</h3><p>Punimet fillojne me <strong>[data]</strong> dhe perfundojne brenda <strong>[numri]</strong> diteve kalendarike. Vonesat e pajustifikuara penalizohen me <strong>[0.1]%</strong> te vleres per cdo dite.</p><h3>Neni 4 - Garancia e Punimeve</h3><p>Sipermarresi garanton punimet per nje periudhe <strong>[2]</strong> vjetesh pas kolaudimit. Per defektet strukturore, garancia eshte <strong>[10]</strong> vjet.</p><h3>Neni 5 - Siguria ne Kantier</h3><p>Sipermarresi merr persiper te gjitha masat e sigurise ne pune sipas legjislacionit ne fuqi dhe mban pergjegjesi te plote per aksidentet ne kantier.</p><h3>Neni 6 - Kolaudimi</h3><p>Pas perfundimit te punimeve, behet kolaudimi nga komisioni perkatës. Dorezimi perfundimtar behet me proces-verbal te nenshkruar nga te dyja palet.</p>",
        category: "construction",
        isActive: true,
        sortOrder: 14,
      },
      {
        title: "Ligji per Huadhenien",
        lawReference: "Nenet 849-870, Kodi Civil (Ligji Nr. 7850)",
        description: "Rregullon kontratat e huase (huadhenies), perfshire huane me dhe pa interes, detyrimet e huamarresit per kthimin e shumes, afatet, kamatat ligjore dhe pasojat e moskthimit.",
        suggestedTerms: "<h2>Kontrate Huadhenieje</h2><p>Ne baze te neneve 849-870 te Kodit Civil:</p><h3>Neni 1 - Objekti i Huase</h3><p>Huadhenesi i jep hua Huamarresit shumen e <strong>[shuma] LEK/EUR</strong>, te cilen Huamarresi e pranon dhe detyrohet ta ktheje sipas kushteve te kesaj kontrate.</p><h3>Neni 2 - Interesi</h3><p>Shuma e huase mbart nje interes vjetor prej <strong>[perqindja]%</strong>, te llogaritur mbi shumen e mbetur te papaguar.</p><h3>Neni 3 - Afati i Kthimit</h3><p>Huamarresi do te ktheje shumen e plote brenda dates <strong>[data]</strong>, sipas grafikut te meposhtem:<br/>- Kesti 1: <strong>[shuma]</strong> deri me <strong>[data]</strong><br/>- Kesti 2: <strong>[shuma]</strong> deri me <strong>[data]</strong></p><h3>Neni 4 - Kthimi i Parakohshem</h3><p>Huamarresi ka te drejte te ktheje huane perpara afatit pa asnje penalitet shtese.</p><h3>Neni 5 - Garancia</h3><p>Si garanci per permbushjen e ketij detyrimi, Huamarresi vendos <strong>[pershkrimi i garancise: pasuri e paluajtshme / dorëzanes / garanci bankare]</strong>.</p><h3>Neni 6 - Moskthimi</h3><p>Ne rast moskthimi te huase brenda afatit, Huadhenesi ka te drejte te kerkoje ekzekutimin e detyrueshem, perfshire shumen kryegjere, interesin dhe shpenzimet gjyqesore.</p>",
        category: "financial",
        isActive: true,
        sortOrder: 15,
      },
    ],
  });

  console.log("  ✓ 15 Legal bases created");

  // Fetch legal bases for linking to contracts
  const allLegalBases = await prisma.legalBasis.findMany({ orderBy: { sortOrder: "asc" } });
  const lbEmployment = allLegalBases.find((lb) => lb.category === "employment")!;
  const lbCivil = allLegalBases.find((lb) => lb.category === "general")!;
  const lbRental = allLegalBases.find((lb) => lb.category === "rental")!;
  const lbCommercial = allLegalBases.find((lb) => lb.category === "commercial")!;
  const lbDataProtection = allLegalBases.find((lb) => lb.category === "data_protection")!;
  const lbDigital = allLegalBases.find((lb) => lb.category === "digital")!;

  // ==================== Demo Contracts ====================
  console.log("Creating demo contracts...");

  // Contract 1: Employment contract — COMPLETED (both parties signed)
  const contract1 = await prisma.contract.create({
    data: {
      contractNumber: "DOCAL-2026-00001",
      title: "Kontrate Pune — Zhvillues Software",
      status: "COMPLETED",
      termsHtml: `<h1 style="text-align: center">Kontrate Pune</h1>
<h2>Palet Kontraktuese</h2>
<p><strong>Pala 1 (Punedhenesi):</strong> Doc.al Solutions SHPK, NIPT: L91234567A, Adresa: Rruga Ismail Qemali Nr. 27, Tirane, Tel: +355691234567, Email: admin@doc.al</p>
<p><strong>Pala 2 (Punemarresi):</strong> Besnik Shehu, Nr. ID: I12345678A, Adresa: Rruga Myslym Shyri Nr. 42, Tirane, Tel: +355694567890, Email: besnik@gmail.com</p>
<hr/>
<h2>Baza Ligjore</h2>
<p>Kjo kontrate mbeshtet ne bazat ligjore te meposhtme:</p>
<p>• <strong>Kodi i Punes i Republikes se Shqiperise</strong> — Ligji Nr. 7961, dt. 12.07.1995 (i ndryshuar)</p>
<p>• <strong>Ligji per Mbrojtjen e te Dhenave Personale</strong> — Ligji Nr. 9887, dt. 10.03.2008 (i ndryshuar)</p>
<hr/>
<h2>Kushtet e Kontrates se Punes</h2>
<h3>Neni 1 - Objekti i Kontrates</h3>
<p>Punemarresi do te kryeje detyrat e pozicionit <strong>Zhvillues Software Senior</strong> ne perputhje me pershkrimin e punes te bashkelidhur.</p>
<h3>Neni 2 - Kohezgjatja</h3>
<p>Kjo kontrate lidhet per nje periudhe <strong>te pacaktuar</strong>, duke filluar nga data <strong>01.03.2026</strong>.</p>
<h3>Neni 3 - Paga dhe Perftimet</h3>
<p>Paga mujore bruto eshte <strong>180,000 LEK</strong>, e pagueshme brenda dates 5 te cdo muaji. Punemarresi perfiton sigurime shoqerore dhe shendetesore sipas legjislacionit ne fuqi.</p>
<h3>Neni 4 - Orari i Punes</h3>
<p>Orari i punes eshte 40 ore ne jave, nga e Hena ne te Premte, ora 09:00 - 17:30 me pushim dreke 30 minuta.</p>
<h3>Neni 5 - Pushimet Vjetore</h3>
<p>Punemarresi ka te drejte per <strong>22</strong> dite pune pushime vjetore te paguara.</p>
<h3>Neni 6 - Periudha e Proves</h3>
<p>Periudha e proves eshte <strong>3 muaj</strong> gjate se ciles secila pale mund te zgjidhe kontraten me njoftim <strong>5 dite</strong> pune.</p>
<h3>Neni 7 - Konfidencialiteti</h3>
<p>Punemarresi angazhohet te ruaje konfidencialitetin e te gjitha informacioneve te biznesit per nje periudhe <strong>2 vjet</strong> pas perfundimit te kontrates.</p>
<h2>Nenshkrimi Elektronik</h2>
<p>Duke nenshkruar elektronikisht kete dokument, secila pale deklaron se ka lexuar, kuptuar dhe pranuar te gjitha kushtet e kontrates.</p>`,
      generatedAt: new Date("2026-02-15"),
      effectiveAt: new Date("2026-02-18"),
      documentHash: sha256("DOCAL-2026-00001-employment-contract"),
      createdById: admin.id,
      organizationId: org1.id,
      parties: {
        create: [
          {
            partyNumber: 1,
            role: "Punedhenesi",
            fullName: "Doc.al Solutions SHPK",
            idNumber: "L91234567A",
            address: "Rruga Ismail Qemali Nr. 27, Tirane",
            phone: "+355691234567",
            email: "admin@doc.al",
            userId: superAdmin.id,
            signedAt: new Date("2026-02-16"),
          },
          {
            partyNumber: 2,
            role: "Punemarresi",
            fullName: "Besnik Shehu",
            idNumber: "I12345678A",
            address: "Rruga Myslym Shyri Nr. 42, Tirane",
            phone: "+355694567890",
            email: "besnik@gmail.com",
            userId: user3.id,
            signedAt: new Date("2026-02-18"),
          },
        ],
      },
      legalBases: {
        create: [
          { legalBasisId: lbEmployment.id },
          { legalBasisId: lbDataProtection.id },
        ],
      },
    },
  });

  // Contract 2: Rental contract — PENDING_SIGNATURE (1 of 2 signed)
  const contract2 = await prisma.contract.create({
    data: {
      contractNumber: "DOCAL-2026-00002",
      title: "Kontrate Qiraje — Zyra Qendrore",
      status: "PARTIALLY_SIGNED",
      termsHtml: `<h1 style="text-align: center">Kontrate Qiraje</h1>
<h2>Palet Kontraktuese</h2>
<p><strong>Pala 1 (Qiradhenes):</strong> Arben Malaj, Nr. ID: J45678901B, Adresa: Bulevardi Zogu I Nr. 15, Tirane, Tel: +355695551234, Email: arben@drejtesia.gov.al</p>
<p><strong>Pala 2 (Qiramarres):</strong> Doc.al Solutions SHPK, NIPT: L91234567A, Adresa: Rruga Ismail Qemali Nr. 27, Tirane, Email: daniel@doc.al</p>
<hr/>
<h2>Baza Ligjore</h2>
<p>• <strong>Ligji per Qirate</strong> — Nenet 801-849, Kodi Civil (Ligji Nr. 7850)</p>
<p>• <strong>Kodi Civil i Republikes se Shqiperise</strong> — Ligji Nr. 7850, dt. 29.07.1994 (i ndryshuar)</p>
<hr/>
<h3>Neni 1 - Objekti i Qirase</h3>
<p>Qiradhenes i jep me qira Qiramerresit ambjentet zyrtare te ndodhura ne adresen: <strong>Bulevardi Zogu I Nr. 15, Kati 3, Tirane</strong>, me siperfaqe totale <strong>120 m2</strong>.</p>
<h3>Neni 2 - Afati i Qirase</h3>
<p>Kontrata e qirase lidhet per periudhen nga <strong>01.04.2026</strong> deri me <strong>31.03.2029</strong>, me mundesi rinovimi me marreveshje te ndersjellet.</p>
<h3>Neni 3 - Qiraja Mujore</h3>
<p>Qiraja mujore eshte <strong>1,200 EUR</strong>, e pagueshme brenda dates 5 te cdo muaji ne llogarine bankare te Qiradhinesit.</p>
<h3>Neni 4 - Depozita</h3>
<p>Qiramerres depoziton shumen e <strong>2,400 EUR</strong> (2 muaj qira) si garanci.</p>
<h3>Neni 5 - Mirebajtja</h3>
<p>Qiramerres merr persiper mirebajtjen e perditshme. Riparime te medha jane ne ngarkim te Qiradhinesit.</p>`,
      generatedAt: new Date("2026-03-01"),
      documentHash: sha256("DOCAL-2026-00002-rental-contract"),
      createdById: admin.id,
      organizationId: org1.id,
      parties: {
        create: [
          {
            partyNumber: 1,
            role: "Qiradhenes",
            fullName: "Arben Malaj",
            idNumber: "J45678901B",
            address: "Bulevardi Zogu I Nr. 15, Tirane",
            phone: "+355695551234",
            email: "arben@drejtesia.gov.al",
            userId: user1.id,
            signedAt: new Date("2026-03-05"),
          },
          {
            partyNumber: 2,
            role: "Qiramarres",
            fullName: "Doc.al Solutions SHPK",
            idNumber: "L91234567A",
            address: "Rruga Ismail Qemali Nr. 27, Tirane",
            phone: "+355692345678",
            email: "daniel@doc.al",
            userId: admin.id,
          },
        ],
      },
      legalBases: {
        create: [
          { legalBasisId: lbRental.id },
          { legalBasisId: lbCivil.id },
        ],
      },
    },
  });

  // Contract 3: Commercial partnership — DRAFT
  const contract3 = await prisma.contract.create({
    data: {
      contractNumber: "DOCAL-2026-00003",
      title: "Marreveshje Bashkepunimi — BKT & Doc.al",
      status: "DRAFT",
      termsHtml: `<h1 style="text-align: center">Marreveshje Bashkepunimi Tregtar</h1>
<h2>Palet Kontraktuese</h2>
<p><strong>Pala 1 (Ofruesi i Sherbimit):</strong> Doc.al Solutions SHPK, NIPT: L91234567A, Adresa: Rruga Ismail Qemali Nr. 27, Tirane, Email: admin@doc.al</p>
<p><strong>Pala 2 (Klienti):</strong> Banka Kombetare Tregtare SHA, NIPT: J61234567A, Adresa: Bulevardi Zhan D'Ark Nr. 4, Tirane, Email: elira@bkt.com.al</p>
<hr/>
<h2>Baza Ligjore</h2>
<p>• <strong>Ligji per Tregtaret dhe Shoqerite Tregtare</strong> — Ligji Nr. 9901, dt. 14.04.2008</p>
<p>• <strong>Ligji per Nenshkrimin Elektronik</strong> — Ligji Nr. 9880, dt. 25.02.2008</p>
<p>• <strong>Ligji per Mbrojtjen e te Dhenave Personale</strong> — Ligji Nr. 9887, dt. 10.03.2008</p>
<hr/>
<h3>Neni 1 - Objekti i Bashkepunimit</h3>
<p>Doc.al Solutions do te ofrojne per BKT-ne platformen e nenshkrimit elektronik per dokumentet bankare, perfshire kontratat e kredise, marreveshjet e llogarive dhe dokumentet e brendshme.</p>
<h3>Neni 2 - Detyrimet e Doc.al</h3>
<ul>
<li>Integrimin API te plote me sistemet e BKT-se</li>
<li>Suport teknik 24/7 me SLA 99.9% uptime</li>
<li>Trajnim per stafin e BKT (deri 50 perdorues)</li>
<li>Ruajtje e te dhenave ne servera brenda Shqiperise</li>
</ul>
<h3>Neni 3 - Detyrimet e BKT</h3>
<ul>
<li>Pagesen e tarifes mujore sipas planit ENTERPRISE</li>
<li>Caktimin e nje personi kontakti per koordinim teknik</li>
<li>Respektimin e politikave te sigurise se Doc.al</li>
</ul>
<h3>Neni 4 - Kushtet Financiare</h3>
<p>Tarifa mujore: <strong>350,000 LEK</strong> (pa TVSH), e faturueshme ne fillim te cdo muaji. Pagesa brenda 15 diteve nga data e fatures.</p>
<h3>Neni 5 - Kohezgjatja</h3>
<p>Kjo marreveshje lidhet per <strong>24 muaj</strong>, duke filluar nga <strong>01.04.2026</strong>, me rinovim automatik per periudha 12-mujore.</p>
<h3>Neni 6 - Konfidencialiteti</h3>
<p>Te dyja palet angazhohen te ruajne konfidencialitetin e informacionit tregtar per nje periudhe <strong>3 vjet</strong> pas perfundimit te kontrates.</p>`,
      generatedAt: new Date("2026-03-10"),
      documentHash: sha256("DOCAL-2026-00003-commercial-partnership"),
      createdById: admin.id,
      organizationId: org1.id,
      parties: {
        create: [
          {
            partyNumber: 1,
            role: "Ofruesi i Sherbimit",
            fullName: "Doc.al Solutions SHPK",
            idNumber: "L91234567A",
            address: "Rruga Ismail Qemali Nr. 27, Tirane",
            phone: "+355691234567",
            email: "admin@doc.al",
            userId: superAdmin.id,
          },
          {
            partyNumber: 2,
            role: "Klienti",
            fullName: "Banka Kombetare Tregtare SHA",
            idNumber: "J61234567A",
            address: "Bulevardi Zhan D'Ark Nr. 4, Tirane",
            phone: "+355694321000",
            email: "elira@bkt.com.al",
            userId: user2.id,
          },
        ],
      },
      legalBases: {
        create: [
          { legalBasisId: lbCommercial.id },
          { legalBasisId: lbDigital.id },
          { legalBasisId: lbDataProtection.id },
        ],
      },
    },
  });

  // Contract 4: Employment contract — PENDING_SIGNATURE (not yet signed by anyone)
  const contract4 = await prisma.contract.create({
    data: {
      contractNumber: "DOCAL-2026-00004",
      title: "Kontrate Pune — Dizajner UX/UI",
      status: "PENDING_SIGNATURE",
      termsHtml: `<h1 style="text-align: center">Kontrate Pune</h1>
<h2>Palet Kontraktuese</h2>
<p><strong>Pala 1 (Punedhenesi):</strong> GigBook Platform SHPK, NIPT: L82345678B, Adresa: Rruga e Kavajes Nr. 100, Tirane, Email: api@gigbook.al</p>
<p><strong>Pala 2 (Punemarresi):</strong> Arlind Krasniqi, Nr. ID: 1100789456, Adresa: Bulevardi Nena Tereze Nr. 18, Prishtine, Email: arlind@hotmail.com</p>
<hr/>
<h2>Baza Ligjore</h2>
<p>• <strong>Kodi i Punes</strong> — Ligji Nr. 7961</p>
<hr/>
<h3>Neni 1 - Pozicioni</h3>
<p>Punemarresi do te kryeje detyrat e pozicionit <strong>Dizajner UX/UI Senior</strong>.</p>
<h3>Neni 2 - Kohezgjatja</h3>
<p>Kontrate me afat <strong>12 muaj</strong>, duke filluar nga <strong>15.03.2026</strong>.</p>
<h3>Neni 3 - Paga</h3>
<p>Paga mujore bruto: <strong>150,000 LEK</strong>.</p>
<h3>Neni 4 - Puna ne Distance</h3>
<p>Punemarresi lejohet te punoj ne distance (remote) deri ne <strong>3 dite ne jave</strong>.</p>`,
      generatedAt: new Date("2026-03-12"),
      documentHash: sha256("DOCAL-2026-00004-ux-designer"),
      createdById: admin.id,
      organizationId: org4.id,
      parties: {
        create: [
          {
            partyNumber: 1,
            role: "Punedhenesi",
            fullName: "GigBook Platform SHPK",
            idNumber: "L82345678B",
            address: "Rruga e Kavajes Nr. 100, Tirane",
            phone: "+355698765432",
            email: "api@gigbook.al",
          },
          {
            partyNumber: 2,
            role: "Punemarresi",
            fullName: "Arlind Krasniqi",
            idNumber: "1100789456",
            address: "Bulevardi Nena Tereze Nr. 18, Prishtine",
            phone: "+38345123456",
            email: "arlind@hotmail.com",
            userId: user3b.id,
          },
        ],
      },
      legalBases: {
        create: [{ legalBasisId: lbEmployment.id }],
      },
    },
  });

  // Contract 5: Insurance agreement — COMPLETED (3-party contract)
  const contract5 = await prisma.contract.create({
    data: {
      contractNumber: "DOCAL-2026-00005",
      title: "Polica Sigurimi — Sigurimi i Jetes",
      status: "COMPLETED",
      termsHtml: `<h1 style="text-align: center">Polica e Sigurimit te Jetes</h1>
<h2>Palet Kontraktuese</h2>
<p><strong>Pala 1 (Siguruesi):</strong> MAIF Assurance Albania SHA, NIPT: K91234567C, Adresa: Rruga Abdi Toptani Nr. 5, Tirane, Email: agent@maif.al</p>
<p><strong>Pala 2 (I Siguruari):</strong> Daniel Kasa, Nr. ID: I98765432B, Adresa: Rruga Ismail Qemali Nr. 27, Tirane, Email: daniel@doc.al</p>
<p><strong>Pala 3 (Perfituesi):</strong> Besnik Shehu, Nr. ID: I12345678A, Adresa: Rruga Myslym Shyri Nr. 42, Tirane, Email: besnik@gmail.com</p>
<hr/>
<h2>Baza Ligjore</h2>
<p>• <strong>Kodi Civil</strong> — Ligji Nr. 7850 (Nenet per Sigurimin)</p>
<p>• <strong>Ligji per Mbrojtjen e te Dhenave Personale</strong> — Ligji Nr. 9887</p>
<hr/>
<h3>Neni 1 - Objekti</h3>
<p>Siguruesi merr persiper te paguaje shumen e sigurimit ne rast te ngjarjes se siguruar.</p>
<h3>Neni 2 - Shuma e Sigurimit</h3>
<p>Shuma e plote e sigurimit: <strong>5,000,000 LEK</strong>.</p>
<h3>Neni 3 - Primi i Sigurimit</h3>
<p>Primi vjetor: <strong>85,000 LEK</strong>, i pagueshme ne 2 keste (Janar dhe Korrik).</p>
<h3>Neni 4 - Kohezgjatja</h3>
<p>Polica mbulon periudhen <strong>01.01.2026 - 31.12.2026</strong> me rinovim automatik.</p>`,
      generatedAt: new Date("2026-01-05"),
      effectiveAt: new Date("2026-01-10"),
      documentHash: sha256("DOCAL-2026-00005-life-insurance"),
      createdById: admin.id,
      organizationId: org5.id,
      parties: {
        create: [
          {
            partyNumber: 1,
            role: "Siguruesi",
            fullName: "MAIF Assurance Albania SHA",
            idNumber: "K91234567C",
            address: "Rruga Abdi Toptani Nr. 5, Tirane",
            phone: "+355694000001",
            email: "agent@maif.al",
            signedAt: new Date("2026-01-06"),
          },
          {
            partyNumber: 2,
            role: "I Siguruari",
            fullName: "Daniel Kasa",
            idNumber: "I98765432B",
            address: "Rruga Ismail Qemali Nr. 27, Tirane",
            phone: "+355692345678",
            email: "daniel@doc.al",
            userId: admin.id,
            signedAt: new Date("2026-01-08"),
          },
          {
            partyNumber: 3,
            role: "Perfituesi",
            fullName: "Besnik Shehu",
            idNumber: "I12345678A",
            address: "Rruga Myslym Shyri Nr. 42, Tirane",
            phone: "+355694567890",
            email: "besnik@gmail.com",
            userId: user3.id,
            signedAt: new Date("2026-01-10"),
          },
        ],
      },
      legalBases: {
        create: [
          { legalBasisId: lbCivil.id },
          { legalBasisId: lbDataProtection.id },
        ],
      },
    },
  });

  // Contract 6: Cancelled contract
  const contract6 = await prisma.contract.create({
    data: {
      contractNumber: "DOCAL-2026-00006",
      title: "Kontrate Sherbimi IT — E Anulluar",
      status: "CANCELLED",
      termsHtml: `<h1 style="text-align: center">Kontrate Sherbimi IT</h1>
<p>Kjo kontrate u anullua per arsye te ndryshimit te kushteve nga pala e dyte.</p>`,
      generatedAt: new Date("2026-02-20"),
      documentHash: sha256("DOCAL-2026-00006-cancelled"),
      createdById: admin.id,
      organizationId: org1.id,
      parties: {
        create: [
          {
            partyNumber: 1,
            role: "Ofruesi",
            fullName: "Doc.al Solutions SHPK",
            idNumber: "L91234567A",
            address: "Rruga Ismail Qemali Nr. 27, Tirane",
            email: "admin@doc.al",
            userId: superAdmin.id,
          },
          {
            partyNumber: 2,
            role: "Klienti",
            fullName: "Fatjon Dervishi",
            idNumber: "I55443322C",
            address: "Rruga e Dibres Nr. 8, Tirane",
            email: "fatjon@yahoo.com",
            userId: user3c.id,
          },
        ],
      },
      legalBases: {
        create: [{ legalBasisId: lbCommercial.id }],
      },
    },
  });

  console.log("  ✓ 6 Demo contracts created");
  console.log("    #00001 Kontrate Pune (COMPLETED, 2 pale)");
  console.log("    #00002 Kontrate Qiraje (PARTIALLY_SIGNED, 1/2)");
  console.log("    #00003 Marreveshje Bashkepunimi (DRAFT)");
  console.log("    #00004 Kontrate Pune UX/UI (PENDING_SIGNATURE)");
  console.log("    #00005 Polica Sigurimi (COMPLETED, 3 pale)");
  console.log("    #00006 Kontrate e Anulluar (CANCELLED)");

  console.log("  DATA CREATED:");
  console.log("    5 Organizations (Doc.al, Drejtesia, BKT, GigBook, MAIF)");
  console.log("    9 Users (2 admin, 4 user, 3 api/org)");
  console.log("    6 Certificates (2 expiring soon with renewal alerts)");
  console.log("    16 Documents (incl. GigBook & MAIF contracts)");
  console.log("    22 Signatures (multi-signer flows)");
  console.log("    24 Timestamp entries (chained)");
  console.log("    3 API Keys (Doc.al, BKT, GigBook)");
  console.log("    6 Signing templates (pdfme-based with multi-page)");
  console.log("    8 Signing requests (incl. API-branded: GigBook, MAIF)");
  console.log("    24 Audit log entries");
  console.log("    2 Contact requests");
  console.log("    2 Certificate renewal alerts");
  console.log("    6 Legal bases (employment, civil, rental, commercial, data protection, digital)");
  console.log("    6 Contracts (2 completed, 1 partial, 1 pending, 1 draft, 1 cancelled)");
  console.log("========================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
