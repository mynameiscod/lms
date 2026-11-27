import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';

/**
 * Career-track content, batch 4: Spring Boot and the full stack, for Java Full Stack + AI (and Java
 * Backend Engineer). One API is grown through the topics — REST, then Spring Data, then security,
 * then tests — and the React app from batch 1 is wired to it and deployed. These need a running
 * server and database, so their practice is questions and project briefs, not auto-graded code.
 */
export const TRACK_BOOT: Record<string, TopicSeed> = {
  /* ── Spring Boot and REST ── */
  JT_BOOT_REST: { category: 'UNIVERSAL', units: [
    u('INITIALIZR', 'Spring Boot: Starters, Auto-Configuration and the Project Layout', 'Spring Initializr, starters, what auto-configuration does for you, and the embedded server.',
      ['Generate a Spring Boot project, run it, and explain what the starters and auto-configuration set up'], 40),
    u('REST_CONTROLLERS', 'REST Controllers and Mappings', '@RestController, @GetMapping and friends, path variables and query parameters.',
      ['Expose CRUD endpoints for a resource with the right verbs and paths'], 45, { after: ['INITIALIZR'] }),
    u('REQUEST_RESPONSE', 'Request Bodies, DTOs and Status Codes', '@RequestBody, DTOs instead of entities, ResponseEntity and the status code each outcome deserves.',
      ['Accept and return DTOs and answer each outcome with the correct HTTP status'], 45, { after: ['REST_CONTROLLERS'] }),
    u('VALIDATION', 'Validating Input', 'Bean Validation annotations, @Valid, and what the caller sees when input is wrong.',
      ['Validate request bodies with Bean Validation and return field errors the caller can use'], 40, { after: ['REQUEST_RESPONSE'] }),
    u('EXCEPTION_HANDLING', 'Global Exception Handling', '@RestControllerAdvice, @ExceptionHandler, and one error shape for the whole API.',
      ['Map exceptions to consistent JSON error responses in one place'], 40, { after: ['VALIDATION'] }),
    u('CONFIG_PROFILES_LOGGING', 'Configuration, Profiles and Logging', 'application.yml, @ConfigurationProperties, dev and prod profiles, environment variables and SLF4J logging.',
      ['Configure an app per environment without code changes and log at the right levels'], 40, { after: ['EXCEPTION_HANDLING'] }),
    u('OPENAPI', 'Documenting the API with OpenAPI and Swagger UI', 'springdoc-openapi, the generated spec, and an API another developer can call without asking you.',
      ['Generate OpenAPI docs and Swagger UI for an API and describe its endpoints'], 30, { after: ['CONFIG_PROFILES_LOGGING'] }),
    ...ending('Spring Boot REST APIs', 'OPENAPI', { project: ['MINI_PROJECT', 'Mini Project — A Product Catalogue REST API', 'A Spring Boot REST API for a product catalogue: CRUD endpoints with DTOs, validation, one error shape, dev/prod profiles and Swagger docs.'] }),
  ] },

  /* ── Spring Data JPA ── */
  JT_BOOT_DATA: { category: 'UNIVERSAL', units: [
    u('REPOSITORIES', 'Spring Data Repositories', 'JpaRepository, what you get without writing a line, and connecting Boot to MySQL.',
      ['Persist entities through a JpaRepository against MySQL'], 40, { skillKeys: ['JPA_HIBERNATE'] }),
    u('QUERIES', 'Derived Queries, @Query and Projections', 'Query methods from their names, JPQL and native @Query, and returning only the columns you need.',
      ['Write derived, JPQL and native queries in a repository and return projections'], 45, { after: ['REPOSITORIES'], skillKeys: ['JPA_HIBERNATE'] }),
    u('PAGINATION_SORTING', 'Pagination and Sorting', 'Pageable, Page and Sort, and an endpoint that never returns ten thousand rows.',
      ['Serve a paged, sorted list endpoint and explain what Page returns'], 35, { after: ['QUERIES'] }),
    u('SERVICE_TRANSACTIONS', 'The Service Layer and @Transactional', 'Controller, service, repository; where a transaction starts and ends; mapping entities to DTOs.',
      ['Put business logic in a transactional service and keep entities out of the API'], 45, { after: ['PAGINATION_SORTING'] }),
    ...ending('Spring Data JPA', 'SERVICE_TRANSACTIONS', { minutes: [40, 55, 35, 40] }),
  ] },

  /* ── Spring Security and JWT ── */
  JT_BOOT_SECURITY: { category: 'UNIVERSAL', units: [
    u('FILTER_CHAIN', 'How Spring Security Works: The Filter Chain', 'What happens to a request before your controller, SecurityFilterChain, and permitting and denying paths.',
      ['Configure a SecurityFilterChain and explain the order a request is checked in'], 45),
    u('USERS_PASSWORDS', 'Users and Passwords', 'UserDetailsService, BCrypt, and why a password is never stored or logged.',
      ['Register and load users from MySQL with BCrypt-hashed passwords'], 40, { after: ['FILTER_CHAIN'] }),
    u('JWT_AUTH', 'JWT Authentication', 'A login endpoint that issues a token, a filter that checks it, expiry, and what a JWT does not protect.',
      ['Issue and validate JWTs in a stateless Spring Boot API'], 55, { after: ['USERS_PASSWORDS'], skillKeys: ['SPRING_SECURITY', 'AUTHENTICATION'] }),
    u('ROLES_ACCESS', 'Roles and Method Security', 'Role-based rules, @PreAuthorize, and checking that a user may touch THIS record.',
      ['Restrict endpoints by role and enforce ownership checks on records'], 45, { after: ['JWT_AUTH'], skillKeys: ['SPRING_SECURITY', 'AUTHORIZATION'] }),
    ...ending('Spring Security', 'ROLES_ACCESS', { minutes: [45, 55, 40, 40] }),
  ] },

  /* ── Testing Spring Boot ── */
  JT_BOOT_TESTING: { category: 'UNIVERSAL', units: [
    u('JUNIT5', 'Unit Tests with JUnit 5', 'Arrange-act-assert, assertions, parameterised tests, and testing one thing at a time.',
      ['Write focused JUnit 5 tests for service logic, including the failure cases'], 40),
    u('MOCKITO', 'Mocking Dependencies with Mockito', '@Mock and @InjectMocks, stubbing, verifying calls, and when a mock lies to you.',
      ['Test a service in isolation by mocking its repository'], 40, { after: ['JUNIT5'] }),
    u('MOCKMVC', 'Testing Controllers with MockMvc', '@WebMvcTest, sending requests, asserting status and JSON, and testing secured endpoints.',
      ['Test REST endpoints with MockMvc, including validation errors and access rules'], 45, { after: ['MOCKITO'] }),
    u('REPOSITORY_TESTS', 'Repository and Integration Tests', '@DataJpaTest, @SpringBootTest, test data, and what each test slice loads and costs.',
      ['Test repository queries and one end-to-end flow, and choose the right test slice'], 40, { after: ['MOCKMVC'] }),
    ...ending('Spring Boot Testing', 'REPOSITORY_TESTS', { project: ['MINI_PROJECT', 'Mini Project — A Secured, Tested Library API', 'A library API on Spring Boot and MySQL: books, members and loans through Spring Data, JWT login with roles, and unit, MockMvc and repository tests.'] }),
  ] },

  /* ── Full-stack integration and deployment ── */
  JT_FULLSTACK: { category: 'UNIVERSAL', units: [
    u('REACT_CALLS_BOOT', 'React Calling Spring Boot', 'An API client with axios, the base URL from the environment, and the Vite dev proxy.',
      ['Call a Spring Boot API from React through one configured client'], 40),
    u('CORS', 'CORS: Why the Browser Blocks You', 'Origins, preflight requests, and configuring CORS in Spring Boot without opening it to everyone.',
      ['Explain a CORS error and allow exactly the origins that need access'], 35, { after: ['REACT_CALLS_BOOT'] }),
    u('JWT_LOGIN_FLOW', 'The Login Flow End to End', 'Logging in, keeping the token, sending it on every call, protected routes, and handling 401 and expiry.',
      ['Build a working JWT login across React and Spring Boot, including logout and expiry'], 55, { after: ['CORS'], skillKeys: ['AUTHENTICATION'] }),
    u('FILE_UPLOAD', 'Uploading Files', 'Multipart requests from a React form, MultipartFile in Spring Boot, size limits and where files go.',
      ['Upload a file from React to Spring Boot with validation and size limits'], 40, { after: ['JWT_LOGIN_FLOW'] }),
    u('ERRORS_ACROSS', 'Errors Across Both Halves', 'One error contract, showing field errors in the form, and the network failure nobody handled.',
      ['Show API validation errors in a React form and handle network failures gracefully'], 35, { after: ['FILE_UPLOAD'] }),
    u('DOCKER', 'Docker for the Full Stack', 'A Dockerfile for the Boot jar, one for the React build behind nginx, and docker compose with MySQL.',
      ['Run the API, the React app and MySQL together with docker compose'], 50, { after: ['ERRORS_ACROSS'], skillKeys: ['CONTAINERS_DOCKER'] }),
    u('DEPLOY', 'Deploying the Stack to the Cloud', 'A managed MySQL, the API and the frontend on a cloud host, secrets in environment variables, and checking it works.',
      ['Deploy the full stack to a cloud host with configuration kept out of the code'], 50, { after: ['DOCKER'], skillKeys: ['DEPLOYMENT'] }),
    ...ending('Full-Stack Integration', 'DEPLOY', { project: ['PROJECT', 'Project — A Full-Stack App, Deployed', 'The React frontend and the secured Spring Boot API on MySQL as one application: login, roles, CRUD, an upload, consistent errors, Docker, and a public URL.'] }),
  ] },
};
