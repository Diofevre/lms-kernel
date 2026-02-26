# Coding Standards — LMS Kernel

> **L'agent DOIT lire ce fichier avant d'écrire la moindre ligne de code.**
> Ces règles sont enforced automatiquement par ESLint + la CI.
> Une PR qui viole ces règles sera bloquée.

---

## TypeScript — Règles strictes

### ❌ JAMAIS
```typescript
// Pas de `any`
const data: any = getData();

// Pas de non-null assertion sans commentaire justifié
const user = getUser()!;

// Pas de cast forcé
const id = value as string;

// Pas de magic numbers ou strings
if (status === 3) { ... }
const url = "https://api.example.com/v1";

// Pas de console.log (utiliser le logger injecté)
console.log("debug");
```

### ✅ TOUJOURS
```typescript
// Types explicites sur tout
const data: UserDto = getData();

// Constantes nommées pour les valeurs fixes
const MAX_LOGIN_ATTEMPTS = 5;
const API_VERSION = "v1" as const;

// Enums ou const objects pour les états
enum CourseStatus { DRAFT = "DRAFT", PUBLISHED = "PUBLISHED" }

// Logger injecté (NestJS)
constructor(private readonly logger: Logger) {}
this.logger.log("Action performed", { userId, action });

// Null handling explicite
const user = await this.userRepo.findOne(id);
if (!user) throw new NotFoundException(`User ${id} not found`);
```

---

## NestJS — Patterns obligatoires

### Controllers
```typescript
// ✅ Toujours : version, swagger tag, guard, typed response
@ApiTags("courses")
@Controller({ path: "courses", version: "1" })
@UseGuards(AuthGuard)
@ApiBearerAuth("Keycloak")
export class CoursesController {

  // ✅ Toujours : ApiOperation avec description complète
  @Post()
  @Roles("instructor", "tenant_admin")
  @ApiOperation({
    summary: "Create a course",
    description: "Creates a draft course for the current tenant. Instructor role required.",
  })
  @ApiResponse({ status: 201, type: CourseResponseDto })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  async create(@Body() dto: CreateCourseDto): Promise<CourseResponseDto> {
    return this.coursesService.create(dto);
  }
}

// ❌ Jamais : routes sans guard, sans swagger, sans types
@Post()
async create(@Body() body: any) {
  return this.service.create(body);
}
```

### DTOs — Validation obligatoire
```typescript
// ✅ Toujours : class-validator + class-transformer + swagger
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCourseDto {
  @ApiProperty({ description: "Course title", maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: "Course description", maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}

// ❌ Jamais : interfaces ou objets non validés
interface CreateCourse { title: string; }
```

### Services — Séparation des responsabilités
```typescript
// ✅ Service = logique métier uniquement, jamais de HTTP
@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly logger: Logger,
  ) {}

  async create(dto: CreateCourseDto, actor: AuthenticatedUser): Promise<Course> {
    const course = await this.prisma.course.create({
      data: { ...dto, tenantId: actor.tenantId, instructorId: actor.id },
    });

    // Toujours audit les créations
    await this.auditLog.log("content.course_published", {
      id: actor.id, type: "user"
    }, { type: "course", id: course.id }, actor.tenantId);

    return course;
  }
}
```

---

## Prisma / Base de données

### Schema — Template obligatoire pour chaque entité
```prisma
model Course {
  // ✅ Obligatoire sur TOUTE entité
  id        String   @id @default(uuid())
  tenantId  String   // Multi-tenant — jamais oublier
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete — jamais de hard delete

  // Champs métier
  title       String   @db.VarChar(200)
  description String?  @db.Text
  status      CourseStatus @default(DRAFT)

  // Relations
  instructor  User   @relation(fields: [instructorId], references: [id])
  instructorId String

  // Index obligatoires
  @@index([tenantId])
  @@index([tenantId, status])
}

// ❌ Jamais : entité sans tenantId, sans soft delete, sans index
model BadEntity {
  id    String @id
  title String
}
```

### Requêtes — Toujours scoper par tenant
```typescript
// ✅ Toujours : filtre tenantId sur CHAQUE requête
const courses = await this.prisma.course.findMany({
  where: {
    tenantId: user.tenantId,  // OBLIGATOIRE
    deletedAt: null,          // Exclure soft-deleted
  },
});

// ❌ Jamais : requête sans tenant scope (fuite inter-tenant)
const courses = await this.prisma.course.findMany();
```

---

## Frontend Next.js / Shadcn

### Couleurs et design tokens — jamais hardcodé
```tsx
// ✅ CSS variables (définis dans globals.css)
<div className="bg-background text-foreground border-border">

// ✅ Classes Tailwind sémantiques
<Button variant="default" size="sm">

// ❌ Jamais : couleurs hardcodées
<div style={{ color: "#3B82F6", backgroundColor: "#ffffff" }}>
<div className="text-[#3B82F6]">
```

### Composants — Toujours Radix/Shadcn pour les éléments interactifs
```tsx
// ✅ Radix = accessible par défaut (WCAG AA)
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ❌ Jamais : éléments HTML natifs non accessibles pour l'UI
<div onClick={handleClick}>Cliquer ici</div>
<input type="text" />  // Toujours avec label associé
```

### Accessibilité — Non négociable
```tsx
// ✅ Obligatoire
<img src={course.thumbnail} alt={`Thumbnail du cours ${course.title}`} />
<button aria-label="Fermer la modale">✕</button>
<input id="email" aria-describedby="email-hint" />
<span id="email-hint">Format: exemple@domaine.com</span>

// ❌ Jamais
<img src={thumbnail} />          // alt manquant
<div role="button">Cliquer</div> // Utiliser <button>
```

---

## Structure de fichiers — Obligatoire pour chaque module

```
modules/votre-module/
├── SPEC.md                    ← OBLIGATOIRE — écrire AVANT de coder
├── PRIVACY_IMPACT.md          ← Si le module collecte des données personnelles
├── package.json
├── src/
│   ├── module.ts              ← KernelModule
│   ├── constants.ts           ← Toutes les constantes du module
│   ├── types.ts               ← Types et interfaces internes
│   ├── votre-module.module.ts
│   ├── votre-module.controller.ts
│   ├── votre-module.service.ts
│   └── dto/
│       ├── create-*.dto.ts
│       ├── update-*.dto.ts
│       └── response-*.dto.ts
└── tests/
    ├── votre-module.service.spec.ts
    └── votre-module.controller.spec.ts
```

---

## Ce que l'agent doit faire AVANT d'écrire du code

1. **Lire** : `AGENT_ONBOARDING.md`, `ARCHITECTURE.md`, `MODULE_CONTRACT.md`
2. **Écrire** `SPEC.md` dans le dossier du module (quoi, pourquoi, décisions)
3. **Écrire** les DTOs et types AVANT les services
4. **Écrire** les tests AVANT ou EN MÊME TEMPS que le code (pas après)
5. **Vérifier** : `pnpm typecheck && pnpm lint` avant chaque commit
