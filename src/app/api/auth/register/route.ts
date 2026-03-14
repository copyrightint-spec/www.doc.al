import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;

const registerSchema = z.object({
  name: z.string().min(2, "Emri duhet te kete te pakten 2 karaktere"),
  email: z.string().email("Email i pavlefshem"),
  password: z
    .string()
    .min(10, "Fjalekalimi duhet te kete te pakten 10 karaktere")
    .regex(
      passwordRegex,
      "Fjalekalimi duhet te permbaje: shkronje te madhe, te vogel, numer, dhe simbol"
    ),
  organizationName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Rate limit: 3 registrations per hour per IP
  const limited = rateLimit(req, "register");
  if (limited) return limited;

  try {
    const body = await req.json();

    // Verify CAPTCHA
    const captchaValid = await verifyTurnstileToken(body.captchaToken);
    if (!captchaValid) {
      return NextResponse.json(
        { error: "Verifikimi CAPTCHA deshtoi. Provoni perseri." },
        { status: 400 }
      );
    }

    const validated = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Ky email eshte i regjistruar" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(validated.password, 12);

    let organizationId: string | undefined;
    if (validated.organizationName) {
      const org = await prisma.organization.create({
        data: { name: validated.organizationName },
      });
      organizationId = org.id;
    }

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        organizationId,
      },
    });

    return NextResponse.json(
      { message: "Regjistrimi u krye me sukses", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Ndodhi nje gabim" },
      { status: 500 }
    );
  }
}
