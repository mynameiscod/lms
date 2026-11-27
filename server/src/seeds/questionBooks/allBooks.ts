import { SeedBook } from './types';
import hr from './books/hr-interview';
import aptitude from './books/aptitude';
import sql from './books/sql-interview';
import dsa from './books/dsa-interview';
import python from './books/python-interview';
import java from './books/java-interview';
import htmlCss from './books/html-css-interview';
// Company books
import coTcs from './books/tcs-interview';
import coInfosys from './books/infosys-interview';
import coWipro from './books/wipro-interview';
import coAccenture from './books/accenture-interview';
import coCognizant from './books/cognizant-interview';
import coCapgemini from './books/capgemini-interview';
import coHcltech from './books/hcltech-interview';
import coTechMahindra from './books/tech-mahindra-interview';
import coZoho from './books/zoho-interview';
import coAmazon from './books/amazon-interview';
import coMicrosoft from './books/microsoft-interview';
import coDeloitte from './books/deloitte-interview';

// Career-track books (Year 3 and 4, members on that track)
import trJavaFullstack from './books/track-java-fullstack';
import trPythonFullstack from './books/track-python-fullstack';
import trDotnetFullstack from './books/track-dotnet-fullstack';
import trDataAnalytics from './books/track-data-analytics';
import trDataScience from './books/track-data-science';
import trDataEngineering from './books/track-data-engineering';
import trAiEngineer from './books/track-ai-engineer';
import trGenaiEngineer from './books/track-genai-engineer';
import trAgenticAi from './books/track-agentic-ai';
import trMlops from './books/track-mlops';
import trAiSecurity from './books/track-ai-security';
import trCybersecurity from './books/track-cybersecurity';
import trCloudDevops from './books/track-cloud-devops';
import trQaSdet from './books/track-qa-sdet';
import trMobileApp from './books/track-mobile-app';

/** Every shipped question book, in shelf order. Add a new book's file here. */
export const ALL_BOOKS: SeedBook[] = [
  hr, aptitude, sql, dsa, python, java, htmlCss,
  coTcs, coInfosys, coWipro, coAccenture, coCognizant, coCapgemini, coHcltech, coTechMahindra, coZoho, coAmazon, coMicrosoft, coDeloitte,
  trJavaFullstack, trPythonFullstack, trDotnetFullstack, trDataAnalytics, trDataScience, trDataEngineering, trAiEngineer, trGenaiEngineer, trAgenticAi, trMlops, trAiSecurity, trCybersecurity, trCloudDevops, trQaSdet, trMobileApp,
];
