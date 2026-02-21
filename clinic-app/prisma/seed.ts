import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ==========================================
  // DESIGNATIONS
  // ==========================================
  await prisma.designation.createMany({
    data: [
      { id: 1, name: "DOCTOR" },
      { id: 2, name: "RECEPTION" },
    ],
  });

  // ==========================================
  // DISEASES (18 medical conditions)
  // ==========================================
  const diseases = [
    { code: "1", name: "Heart Disease" },
    { code: "2", name: "High Blood Pressure" },
    { code: "3", name: "Asthma" },
    { code: "4", name: "Stroke, Seizures or Convulsions" },
    { code: "5", name: "Psychiatric Treatment" },
    { code: "6", name: "Blood Disorder or Bleeding tendency" },
    { code: "7", name: "Stomach Ulcer" },
    { code: "8", name: "Diabetes" },
    { code: "9", name: "Thyroid" },
    { code: "10", name: "Kidney problem" },
    { code: "11", name: "Hepatitis" },
    { code: "12", name: "Liver disease" },
    { code: "13", name: "HIV Infection" },
    { code: "14", name: "Tuberculosis" },
    { code: "15", name: "Arthritis / Rheumatism" },
    { code: "16", name: "Allergies" },
    { code: "17", name: "Pregnant" },
    { code: "18", name: "Birth Control Pills" },
  ];
  await prisma.disease.createMany({ data: diseases });

  // ==========================================
  // OPERATIONS (100+ dental procedures)
  // ==========================================
  const operations = [
    { code: 1, name: "REG/CONS.", category: "Consultation", defaultMinFee: 100 },
    { code: 3, name: "CURETTAGE", category: "Periodontics" },
    { code: 4, name: "FLAP SURGERY", category: "Periodontics" },
    { code: 6, name: "FRENECTOMY", category: "Periodontics" },
    { code: 7, name: "SCALING", category: "Periodontics" },
    { code: 8, name: "CURETTAGE", category: "Periodontics" },
    { code: 9, name: "FLAP SURGERY", category: "Periodontics" },
    { code: 10, name: "GINGIVECTOMY", category: "Periodontics" },
    { code: 12, name: "EXTRACTION", category: "Oral Surgery" },
    { code: 13, name: "IMPACTION", category: "Oral Surgery" },
    { code: 14, name: "WIRING", category: "Oral Surgery" },
    { code: 15, name: "RCT", category: "Endodontics" },
    { code: 16, name: "FILLING", category: "Restorative" },
    { code: 17, name: "COMP FILLING", category: "Restorative" },
    { code: 18, name: "BLEACHING", category: "Cosmetic" },
    { code: 19, name: "APICECTOMY", category: "Endodontics" },
    { code: 20, name: "N.C. CROWN", category: "Prosthodontics" },
    { code: 21, name: "N.C. BRIDGE", category: "Prosthodontics" },
    { code: 22, name: "C.D.", category: "Prosthodontics" },
    { code: 23, name: "R.P.D.", category: "Prosthodontics" },
    { code: 24, name: "F.P.D.", category: "Prosthodontics" },
    { code: 25, name: "C.P.D.", category: "Prosthodontics" },
    { code: 26, name: "PULPOTOMY", category: "Endodontics" },
    { code: 27, name: "PULPECTOMY (RCT)", category: "Endodontics" },
    { code: 28, name: "DECIDUOUS EXTRACTION", category: "Oral Surgery" },
    { code: 29, name: "SPACE MAINTAINER", category: "Orthodontics" },
    { code: 30, name: "S.S. CROWN", category: "Prosthodontics" },
    { code: 31, name: "I.O.P.A.", category: "Radiology", defaultMinFee: 50 },
    { code: 32, name: "BEGGS", category: "Orthodontics" },
    { code: 33, name: "ST. WIRE", category: "Orthodontics" },
    { code: 34, name: "ORTHO", category: "Orthodontics" },
    { code: 35, name: "CONS. (CGHS)", category: "Consultation", defaultMinFee: 35 },
    { code: 36, name: "I.O.P.A (BSNL)", category: "Radiology", defaultMinFee: 70 },
    { code: 37, name: "CONS & X-RAY", category: "Consultation", defaultMinFee: 150 },
    { code: 38, name: "APPLIANCE", category: "Orthodontics" },
    { code: 39, name: "APPLIANCE REMOVAL", category: "Orthodontics" },
    { code: 40, name: "CONS.", category: "Consultation", defaultMinFee: 100 },
    { code: 41, name: "CHECKUP", category: "Consultation" },
    { code: 42, name: "ALVEOLOPLASTY", category: "Oral Surgery" },
    { code: 44, name: "FILLINGS", category: "Restorative" },
    { code: 45, name: "X-RAY", category: "Radiology" },
    { code: 47, name: "ORTHO (REMOVABLE)", category: "Orthodontics" },
    { code: 48, name: "CONS. (BSNL)", category: "Consultation" },
    { code: 49, name: "COMPOSITES", category: "Restorative" },
    { code: 50, name: "BIOPSY", category: "Oral Surgery" },
    { code: 51, name: "T.T. INJ & CLEANING", category: "Other" },
    { code: 52, name: "NICKEL BRIDGE", category: "Prosthodontics" },
    { code: 53, name: "ABSCESS INCISION", category: "Oral Surgery" },
    { code: 54, name: "FIXATION", category: "Oral Surgery" },
    { code: 55, name: "TEMPORARY", category: "Prosthodontics" },
    { code: 56, name: "N.C.", category: "Prosthodontics" },
    { code: 58, name: "CER CROWN", category: "Prosthodontics" },
    { code: 59, name: "CER FAC CROWN", category: "Prosthodontics" },
    { code: 60, name: "CER BRIDGE", category: "Prosthodontics" },
    { code: 61, name: "CER FAC BRIDGE", category: "Prosthodontics" },
    { code: 62, name: "FLAP", category: "Periodontics" },
    { code: 63, name: "APPLIANCE BREAKAGE", category: "Orthodontics" },
    { code: 64, name: "ACRYLIC CROWN", category: "Prosthodontics" },
    { code: 65, name: "SUTURING", category: "Oral Surgery" },
    { code: 66, name: "RPD REPAIR", category: "Prosthodontics" },
    { code: 67, name: "RETAINER", category: "Orthodontics" },
    { code: 68, name: "CORONOPLASTY", category: "Restorative" },
    { code: 70, name: "CONS. (UNI)", category: "Consultation" },
    { code: 71, name: "SPLINTING", category: "Other" },
    { code: 72, name: "CROWN (S.S.)", category: "Prosthodontics" },
    { code: 73, name: "CROWN CEMENTING", category: "Prosthodontics" },
    { code: 74, name: "APPLIANCE REPAIR", category: "Orthodontics" },
    { code: 75, name: "INCISION DRAINAGE", category: "Oral Surgery" },
    { code: 76, name: "CD REPAIR", category: "Prosthodontics" },
    { code: 77, name: "L/CD", category: "Prosthodontics" },
    { code: 78, name: "U/CD", category: "Prosthodontics" },
    { code: 79, name: "DENTURE CORRECTION", category: "Prosthodontics" },
    { code: 80, name: "COMPOSITE REPAIR", category: "Restorative" },
    { code: 81, name: "SKYCE", category: "Cosmetic" },
    { code: 82, name: "POLISHING", category: "Cosmetic" },
    { code: 83, name: "I.O.P.A (CGHS)", category: "Radiology" },
    { code: 84, name: "SURGICAL EXCISION", category: "Oral Surgery" },
    { code: 85, name: "TEMP FILLING", category: "Restorative" },
    { code: 86, name: "SPLINT", category: "Other" },
    { code: 87, name: "CROWN LENGTHENING", category: "Periodontics" },
    { code: 88, name: "NIGHT GUARD", category: "Other" },
    { code: 89, name: "NEURECTOMY", category: "Oral Surgery" },
    { code: 90, name: "ALL CERAMIC", category: "Prosthodontics" },
    { code: 91, name: "OPERCULECTOMY", category: "Oral Surgery" },
    { code: 92, name: "MAXILLARY TEMPLATE", category: "Prosthodontics" },
    { code: 93, name: "MODEL ANALYSIS", category: "Orthodontics" },
    { code: 94, name: "IMPLANT", category: "Other" },
    { code: 95, name: "CROWN REMOVAL", category: "Prosthodontics" },
    { code: 96, name: "RPD VALPLAST", category: "Prosthodontics" },
    { code: 97, name: "GOLD CROWN", category: "Prosthodontics" },
    { code: 98, name: "SEMI PRECIOUS CROWN", category: "Prosthodontics" },
    { code: 99, name: "TOOTH MOUSSE", category: "Other" },
    { code: 100, name: "LAMINATES", category: "Cosmetic" },
    { code: 101, name: "DRESSING", category: "Other" },
    { code: 102, name: "MINI SCREWS", category: "Orthodontics" },
    { code: 103, name: "FLUORIDE APPLICATION", category: "Other" },
    { code: 104, name: "SURGERY", category: "Oral Surgery" },
    { code: 105, name: "B.P.S. DENTURE", category: "Prosthodontics" },
    { code: 106, name: "FILLER", category: "Cosmetic" },
    { code: 107, name: "SILICON ROD", category: "Cosmetic" },
    { code: 108, name: "POST CORE BUILD UP", category: "Endodontics" },
    { code: 109, name: "COMPOSITE CROWNS", category: "Restorative" },
    { code: 110, name: "BLEPHAROPLASTY", category: "Cosmetic" },
    { code: 111, name: "PTOSIS CORRECTION", category: "Cosmetic" },
    { code: 112, name: "G.A. TREATMENT", category: "Other" },
    { code: 113, name: "LASER FLAP SURGERY", category: "Periodontics" },
    { code: 114, name: "LASER CURETTAGE", category: "Periodontics" },
  ];
  await prisma.operation.createMany({ data: operations });

  // ==========================================
  // LABS (28 dental laboratories)
  // ==========================================
  const labs = [
    { code: 1, name: "MURALI DENTAL LAB" },
    { code: 2, name: "VIJAYA LAB" },
    { code: 3, name: "UZHAIR LAB" },
    { code: 4, name: "TOOTH SHADES" },
    { code: 5, name: "MAHENDRANATH REDDY" },
    { code: 6, name: "M.M. ALI" },
    { code: 7, name: "SAI DENTAL LAB" },
    { code: 8, name: "DENTAL AVENUE" },
    { code: 9, name: "GLOBAL ESTHETICS" },
    { code: 10, name: "MAJID LAB" },
    { code: 11, name: "VENKAT LAB" },
    { code: 12, name: "ESHWAR (ORTHO) DENTAL LAB" },
    { code: 13, name: "ADVANTAGE / ARTISAN DENTAL LAB" },
    { code: 14, name: "KATARA DENTAL (Pune & Hyd)" },
    { code: 15, name: "VENKAIAH DENTAL LAB" },
    { code: 16, name: "VITALIUM LAB" },
    { code: 17, name: "KNACK DENTAL LAB" },
    { code: 18, name: "SHIVAM DANTAKALA" },
    { code: 19, name: "SOUTHMAN DENTAL LAB" },
    { code: 20, name: "SUDHA DENTAL LAB" },
    { code: 21, name: "K.L. DENTAL LAB" },
    { code: 22, name: "INDIAN DENTAL LAB" },
    { code: 23, name: "DIVYA DENTAL LAB" },
    { code: 24, name: "K.P. DENTAL LAB" },
    { code: 25, name: "LAKSHMI DENTAL LAB" },
    { code: 26, name: "AL-ZUBAIDI DENTAL LAB" },
    { code: 27, name: "DENTCARE DENTAL LAB" },
    { code: 28, name: "CONFIDENCE DENTAL LAB" },
  ];
  await prisma.lab.createMany({ data: labs });

  // ==========================================
  // DOCTORS (selected active doctors from legacy)
  // ==========================================
  const doctors = [
    { code: 0, name: "NONE", commissionPercent: 0, designationId: 1, permissionLevel: 2 },
    { code: 1, name: "KAZIM", commissionPercent: 0, designationId: 1, permissionLevel: 1, password: "admin" },
    { code: 2, name: "SURENDER", commissionPercent: 50, tdsPercent: 5.1, designationId: 1, permissionLevel: 3, password: "doctor" },
    { code: 3, name: "RAMANA REDDY", commissionPercent: 75, tdsPercent: 10.3, designationId: 1, permissionLevel: 3, password: "doctor" },
    { code: 4, name: "RAVINDER", commissionPercent: 50, tdsPercent: 10.3, designationId: 1 },
    { code: 5, name: "ANITHA", commissionPercent: 70, tdsPercent: 5.1, designationId: 1 },
    { code: 6, name: "BABU RAM", commissionPercent: 50, tdsPercent: 5.1, designationId: 1 },
    { code: 7, name: "TAUFIQ", commissionPercent: 0, designationId: 1 },
    { code: 9, name: "SHEETAL", commissionPercent: 45, tdsPercent: 5.1, designationId: 1 },
    { code: 10, name: "HEMANTH", commissionPercent: 50, tdsPercent: 5.1, designationId: 1 },
    { code: 16, name: "VIVEK", commissionPercent: 60, tdsPercent: 5.1, designationId: 1 },
    { code: 17, name: "RATHIKA RAI", commissionPercent: 25, tdsPercent: 5.15, designationId: 1 },
    { code: 21, name: "GIRISH KADRI", commissionPercent: 45, tdsPercent: 5.1, designationId: 1 },
    { code: 28, name: "GAUTAM", commissionPercent: 50, tdsPercent: 11.33, designationId: 1 },
    { code: 31, name: "MADHU", commissionPercent: 50, tdsPercent: 11.33, mobile: "9849553445", designationId: 1 },
    { code: 35, name: "BHADRA RAO", commissionPercent: 0, commissionRate: 750, tdsPercent: 11.33, designationId: 1 },
    { code: 44, name: "BHARANI KUMAR REDDY", commissionPercent: 0, tdsPercent: 5.15, designationId: 1 },
    { code: 48, name: "RAJESH REDDY", commissionPercent: 0, tdsPercent: 11.33, mobile: "9177563555", designationId: 1 },
    { code: 60, name: "ANIL", commissionPercent: 0, tdsPercent: 11.33, designationId: 1 },
    { code: 87, name: "MURALIDHAR", commissionPercent: 0, designationId: 2, permissionLevel: 2, password: "admin" },
  ];
  await prisma.doctor.createMany({ data: doctors });

  // ==========================================
  // CLINIC SETTINGS
  // ==========================================
  await prisma.clinicSettings.create({
    data: {
      name: "Secunderabad Dental Hospital",
      addressLine1: "Centre for Advanced Dental Care",
      addressLine2: "1-2-261/4-6, S.D. Road",
      addressLine3: "Opp: Minerva Complex",
      city: "Secunderabad",
      state: "Telangana",
      pincode: "500003",
      phone: "27844043, 66339096",
      email: "secdentl@gmail.com",
      appVersion: "2.0",
    },
  });

  // ==========================================
  // SAMPLE PATIENTS (50 patients for demo)
  // ==========================================
  const patients = [
    { code: 10001, salutation: "Mr", name: "RAMCHANDER", fatherHusbandName: "A. SRIRAMULU", addressLine1: "5-9-912, Gunfoundry", addressLine2: "Hyderabad-1", gender: "M", ageAtRegistration: 42, occupation: "Business", phone: "23297900" },
    { code: 10002, salutation: "Mrs", name: "ABUWALA B.", fatherHusbandName: "HUSSAIN", addressLine1: "30-22-A, A.P.R.T.C Colony", addressLine2: "Sale Mension, Sec-bad-15", gender: "F", ageAtRegistration: 70, occupation: "H.W", phone: "27993122" },
    { code: 10003, salutation: "Mr", name: "SRINIVAS NARRA", fatherHusbandName: "KRISHNA RAO NARRA", addressLine1: "F.No:204, Mythily Apts", addressLine2: "V.V.K.N Colony, Kukatpally", gender: "M", ageAtRegistration: 22, occupation: "S/W Prog.", bloodGroup: "O+", phone: "23065482" },
    { code: 10004, salutation: "Mr", name: "BUCHI RAJU", addressLine1: "Venugopal C/O Lufthansa Cargo", addressLine2: "Begumpet, Hyderabad", gender: "M", ageAtRegistration: 19, occupation: "Student", mobile: "9849028482" },
    { code: 10005, salutation: "Ms", name: "DIVYA MULANI", fatherHusbandName: "VIJAY MULANI", addressLine1: "P.No:7, Krishna Nagar Colony", addressLine2: "P.G. Road, Sec-bad", gender: "F", ageAtRegistration: 6, occupation: "Student", phone: "27840647" },
    { code: 10006, salutation: "Master", name: "CALVIN", fatherHusbandName: "JOHNSON", addressLine1: "1-8-811/A, Prakash Nagar", addressLine2: "Begumpet, Hyd-16", gender: "M", ageAtRegistration: 4, occupation: "Student", bloodGroup: "B+", phone: "27768025" },
    { code: 10007, salutation: "Ms", name: "ANJALI SHEKHAR", fatherHusbandName: "M.K. CHANDRA SHEKHAR", addressLine1: "37-93/371/1, Madhura Nagar Colony", addressLine2: "Neridmet, Sainik Puri", addressLine3: "Secunderabad-94", gender: "F", ageAtRegistration: 15, occupation: "Student", phone: "27112506" },
    { code: 10008, salutation: "Mrs", name: "M.S. SHIREEN", fatherHusbandName: "ABDUL KHADER", addressLine1: "Flat No.7, Nisha Towers", addressLine2: "Opp: Football Ground", addressLine3: "Tirmulgery, Secunderabad-15", gender: "F", ageAtRegistration: 15, occupation: "Student", phone: "27790938" },
    { code: 10009, salutation: "Master", name: "SURYA TEJA", fatherHusbandName: "TRILOK KUMAR", addressLine1: "# 8-3-119, 2nd Bazar", addressLine2: "Secunderabad", gender: "M", ageAtRegistration: 6, occupation: "Student", phone: "27710223" },
    { code: 10010, salutation: "Mr", name: "MAHENDER SAI", fatherHusbandName: "G.V.S. PRASAD", addressLine1: "17-16/1/1, Jyoti Nagar", addressLine2: "Malkajgiri, Sec-bad-17", gender: "M", ageAtRegistration: 6, occupation: "Student", phone: "27054934" },
    { code: 10011, salutation: "Ms", name: "TAMARA ISAAC", fatherHusbandName: "SAJJAN ISAAC", addressLine1: "25, Sectar A, AWHO Colony", addressLine2: "Secunderabad-09", gender: "F", ageAtRegistration: 6, occupation: "Student", phone: "27893283" },
    { code: 10012, salutation: "Mr", name: "HARI DAS", fatherHusbandName: "SRISHAH", addressLine1: "11/2, Shiva Arun Colony", addressLine2: "West Maredpally, Sec-bad-26", gender: "M", occupation: "Student", phone: "7805928" },
    { code: 10013, salutation: "Mrs", name: "MADHURI V.", fatherHusbandName: "V.C.H. SANDYASAYYA", addressLine1: "12-12-102, Ravindra Nagar", addressLine2: "Seetaphal Mandi, Sec-bad-61", gender: "F", ageAtRegistration: 26, phone: "27095923" },
    { code: 10014, salutation: "Mrs", name: "DEEPA SADAGOPAN", fatherHusbandName: "SADDAGOPAN RAJARAM", addressLine1: "12-13-783, St. No.1", addressLine2: "Tarnaka, Sec-bad-17", gender: "F", ageAtRegistration: 21, occupation: "Student", bloodGroup: "A+", phone: "27019348" },
    { code: 10015, salutation: "Mr", name: "MURARI GUPTA", fatherHusbandName: "BABULAL", addressLine1: "10-3-131, East Maredpally", addressLine2: "Secunderabad 500026", gender: "M", ageAtRegistration: 51, occupation: "Business", phone: "55909193" },
    { code: 10016, salutation: "Mrs", name: "MEHER LAKSHMI", gender: "F" },
    { code: 10017, salutation: "Ms", name: "NEHA SARDANA", fatherHusbandName: "S.K. SARDANA", addressLine1: "16, S.P. Road", addressLine2: "Opp. C.T.O., Secunderabad", gender: "F", phone: "27801250" },
    { code: 10018, salutation: "Mr", name: "RAVI KUMAR", addressLine1: "H.No 5-4-187", addressLine2: "Rani Gunj, Secunderabad", gender: "M", ageAtRegistration: 35, occupation: "Engineer", mobile: "9876543210" },
    { code: 10019, salutation: "Mrs", name: "PADMA REDDY", fatherHusbandName: "KRISHNA REDDY", addressLine1: "12-2-823, Mehdipatnam", addressLine2: "Hyderabad-28", gender: "F", ageAtRegistration: 45, occupation: "Teacher", mobile: "9123456789" },
    { code: 10020, salutation: "Mr", name: "AHMED KHAN", addressLine1: "3-6-234, Himayatnagar", addressLine2: "Hyderabad", gender: "M", ageAtRegistration: 55, occupation: "Retired", mobile: "8765432109", bloodGroup: "B+" },
    { code: 10021, salutation: "Mrs", name: "SUNITHA DEVI", fatherHusbandName: "RAMESH", addressLine1: "H.No 8-3-169, Yousufguda", addressLine2: "Hyderabad", gender: "F", ageAtRegistration: 38, occupation: "Homemaker", mobile: "9988776655" },
    { code: 10022, salutation: "Mr", name: "VENKAT RAO", addressLine1: "Plot 45, Jubilee Hills", addressLine2: "Hyderabad-34", gender: "M", ageAtRegistration: 62, occupation: "Businessman", mobile: "9876512345", bloodGroup: "A+" },
    { code: 10023, salutation: "Baby", name: "AARAV SHARMA", fatherHusbandName: "RAJESH SHARMA", addressLine1: "Flat 302, Sri Sai Apts", addressLine2: "AS Rao Nagar, Sec-bad", gender: "M", ageAtRegistration: 3, mobile: "9944332211" },
    { code: 10024, salutation: "Dr", name: "PRIYA MENON", addressLine1: "4-7-53, Bank Street", addressLine2: "Koti, Hyderabad", gender: "F", ageAtRegistration: 40, occupation: "Doctor", mobile: "9012345678", bloodGroup: "O-" },
    { code: 10025, salutation: "Mr", name: "SYED IBRAHIM", addressLine1: "1-7-234, Musheerabad", addressLine2: "Hyderabad", gender: "M", ageAtRegistration: 28, occupation: "Software Engineer", mobile: "7654321098" },
    { code: 10026, salutation: "Mrs", name: "LAKSHMI BAI", fatherHusbandName: "NARAYAN RAO", addressLine1: "H.No 2-2-647, Amberpet", addressLine2: "Hyderabad-13", gender: "F", ageAtRegistration: 58, occupation: "Retired Teacher", phone: "27423098" },
    { code: 10027, salutation: "Mr", name: "RAJENDRA PRASAD", addressLine1: "16-11-511, Dilsukhnagar", addressLine2: "Hyderabad-60", gender: "M", ageAtRegistration: 48, occupation: "Govt Employee", mobile: "8899001122" },
    { code: 10028, salutation: "Ms", name: "KAVITHA REDDY", addressLine1: "Plot 78, Banjara Hills", addressLine2: "Hyderabad-34", gender: "F", ageAtRegistration: 30, occupation: "IT Professional", mobile: "9876789012" },
    { code: 10029, salutation: "Mr", name: "GANESH KUMAR", addressLine1: "5-9-22/1, Basheerbagh", addressLine2: "Hyderabad-1", gender: "M", ageAtRegistration: 44, occupation: "Merchant", mobile: "9567890123", bloodGroup: "AB+" },
    { code: 10030, salutation: "Mrs", name: "FATIMA BEGUM", fatherHusbandName: "MOHAMMED ALI", addressLine1: "Old City, Charminar", addressLine2: "Hyderabad-2", gender: "F", ageAtRegistration: 50, occupation: "Homemaker", mobile: "9234567890" },
    { code: 10031, salutation: "Mr", name: "SURESH BABU", addressLine1: "H.No 4-1-132, Tilak Nagar", addressLine2: "Hyderabad", gender: "M", ageAtRegistration: 33, occupation: "Bank Employee", mobile: "8012345678" },
    { code: 10032, salutation: "Ms", name: "ANITHA KUMARI", addressLine1: "Flat 501, Rainbow Apts", addressLine2: "Kukatpally, Hyderabad", gender: "F", ageAtRegistration: 25, occupation: "Student", mobile: "7890123456" },
    { code: 10033, salutation: "Mr", name: "PRAKASH RAO", addressLine1: "3-4-567, Kachiguda", addressLine2: "Hyderabad-27", gender: "M", ageAtRegistration: 60, occupation: "Retired", phone: "27654321", bloodGroup: "B-" },
    { code: 10034, salutation: "Mrs", name: "SAROJINI DEVI", fatherHusbandName: "PRAKASH RAO", addressLine1: "3-4-567, Kachiguda", addressLine2: "Hyderabad-27", gender: "F", ageAtRegistration: 55, occupation: "Homemaker", phone: "27654321" },
    { code: 10035, salutation: "Mr", name: "KISHORE REDDY", addressLine1: "12-5-149, Tarnaka", addressLine2: "Secunderabad-17", gender: "M", ageAtRegistration: 37, occupation: "Architect", mobile: "9345678901", bloodGroup: "O+" },
    { code: 10036, salutation: "Mrs", name: "JAYA LAKSHMI", fatherHusbandName: "KISHORE REDDY", addressLine1: "12-5-149, Tarnaka", addressLine2: "Secunderabad-17", gender: "F", ageAtRegistration: 34, occupation: "Interior Designer", mobile: "9456789012" },
    { code: 10037, salutation: "Master", name: "ARJUN REDDY", fatherHusbandName: "KISHORE REDDY", addressLine1: "12-5-149, Tarnaka", addressLine2: "Secunderabad-17", gender: "M", ageAtRegistration: 8, occupation: "Student" },
    { code: 10038, salutation: "Mr", name: "DEVENDER GOUD", addressLine1: "H.No 6-3-248, Panjagutta", addressLine2: "Hyderabad-82", gender: "M", ageAtRegistration: 52, occupation: "Politician", mobile: "9876543201" },
    { code: 10039, salutation: "Mrs", name: "NOOR JAHAN", fatherHusbandName: "NAWAB KHAN", addressLine1: "22-3-789, Malakpet", addressLine2: "Hyderabad-36", gender: "F", ageAtRegistration: 65, occupation: "Homemaker", mobile: "8765432198" },
    { code: 10040, salutation: "Mr", name: "RAGHUVEER SINGH", addressLine1: "1-10-72, Ashok Nagar", addressLine2: "Hyderabad-20", gender: "M", ageAtRegistration: 41, occupation: "Police Officer", mobile: "9012398765", bloodGroup: "A-" },
    { code: 10041, salutation: "Ms", name: "POOJA GUPTA", addressLine1: "Flat 203, Sai Enclave", addressLine2: "Ameerpet, Hyderabad", gender: "F", ageAtRegistration: 22, occupation: "Student", mobile: "7654398012" },
    { code: 10042, salutation: "Mr", name: "BALARAM NAIK", addressLine1: "5-8-92, Nallakunta", addressLine2: "Hyderabad-44", gender: "M", ageAtRegistration: 57, occupation: "Shopkeeper", mobile: "9123098765" },
    { code: 10043, salutation: "Mrs", name: "VIJAYA LAKSHMI", fatherHusbandName: "BALARAM NAIK", addressLine1: "5-8-92, Nallakunta", addressLine2: "Hyderabad-44", gender: "F", ageAtRegistration: 52, occupation: "Homemaker", mobile: "9234098765" },
    { code: 10044, salutation: "Mr", name: "ASHOK KUMAR", addressLine1: "H.No 11-3-56, Marredpally", addressLine2: "Secunderabad-26", gender: "M", ageAtRegistration: 39, occupation: "Manager", mobile: "8901234567", bloodGroup: "AB-" },
    { code: 10045, salutation: "Mrs", name: "REKHA SHARMA", fatherHusbandName: "ASHOK KUMAR", addressLine1: "H.No 11-3-56, Marredpally", addressLine2: "Secunderabad-26", gender: "F", ageAtRegistration: 36, occupation: "Homemaker", mobile: "8012398765" },
    { code: 10046, salutation: "Mr", name: "NARASIMHA RAO", addressLine1: "4-4-21, Sultan Bazar", addressLine2: "Hyderabad-95", gender: "M", ageAtRegistration: 70, occupation: "Retired Judge", phone: "24567890", bloodGroup: "O+" },
    { code: 10047, salutation: "Ms", name: "SWATHI REDDY", addressLine1: "Plot 12, Film Nagar", addressLine2: "Hyderabad-33", gender: "F", ageAtRegistration: 27, occupation: "Journalist", mobile: "9876012345" },
    { code: 10048, salutation: "Mr", name: "MOHAMMAD RAFI", addressLine1: "7-1-64, Ameerpet", addressLine2: "Hyderabad-16", gender: "M", ageAtRegistration: 43, occupation: "Auto Driver", mobile: "9321456789" },
    { code: 10049, salutation: "Mrs", name: "SALEHA BEGUM", fatherHusbandName: "MOHAMMAD RAFI", addressLine1: "7-1-64, Ameerpet", addressLine2: "Hyderabad-16", gender: "F", ageAtRegistration: 38, occupation: "Tailor", mobile: "9432567890" },
    { code: 10050, salutation: "Mr", name: "CHANDRA SEKHAR", addressLine1: "2-3-670, Amberpet", addressLine2: "Hyderabad-13", gender: "M", ageAtRegistration: 46, occupation: "Electrician", mobile: "8765012345" },
  ];
  await prisma.patient.createMany({ data: patients });

  // ==========================================
  // SAMPLE VISITS (demonstrating various procedures)
  // ==========================================
  // Get doctor and operation IDs
  const kazim = await prisma.doctor.findFirst({ where: { name: "KAZIM" } });
  const surender = await prisma.doctor.findFirst({ where: { name: "SURENDER" } });
  const ramana = await prisma.doctor.findFirst({ where: { name: "RAMANA REDDY" } });
  const anitha = await prisma.doctor.findFirst({ where: { name: "ANITHA" } });
  const bhadra = await prisma.doctor.findFirst({ where: { name: "BHADRA RAO" } });

  const regCons = await prisma.operation.findFirst({ where: { code: 1 } });
  const scaling = await prisma.operation.findFirst({ where: { code: 7 } });
  const rct = await prisma.operation.findFirst({ where: { code: 15 } });
  const filling = await prisma.operation.findFirst({ where: { code: 16 } });
  const extraction = await prisma.operation.findFirst({ where: { code: 12 } });
  const cerCrown = await prisma.operation.findFirst({ where: { code: 58 } });
  const bleaching = await prisma.operation.findFirst({ where: { code: 18 } });
  const implant = await prisma.operation.findFirst({ where: { code: 94 } });
  const xray = await prisma.operation.findFirst({ where: { code: 31 } });
  const flap = await prisma.operation.findFirst({ where: { code: 4 } });

  const lab7 = await prisma.lab.findFirst({ where: { code: 7 } });

  const today = new Date();
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000);

  // Also look up BMP operation for follow-up seed
  const compFilling = await prisma.operation.findFirst({ where: { code: 17 } });
  const ortho = await prisma.operation.findFirst({ where: { code: 34 } });

  const visits = [
    // Today's visits
    { caseNo: 80001, patientId: 1, visitDate: today, visitType: "NEW", operationId: regCons!.id, operationRate: 100, doctorId: kazim!.id, doctorCommissionPercent: 0 },
    { caseNo: 80002, patientId: 2, visitDate: today, visitType: "NEW", operationId: scaling!.id, operationRate: 1500, doctorId: surender!.id, doctorCommissionPercent: 50 },
    { caseNo: 80003, patientId: 3, visitDate: today, visitType: "NEW", operationId: rct!.id, operationRate: 5000, doctorId: ramana!.id, doctorCommissionPercent: 75, discount: 500 },
    // Yesterday
    { caseNo: 80004, patientId: 4, visitDate: daysAgo(1), visitType: "NEW", operationId: filling!.id, operationRate: 800, doctorId: anitha!.id, doctorCommissionPercent: 70 },
    { caseNo: 80005, patientId: 5, visitDate: daysAgo(1), visitType: "NEW", operationId: extraction!.id, operationRate: 1200, doctorId: surender!.id, doctorCommissionPercent: 50 },
    // This week
    { caseNo: 80006, patientId: 6, visitDate: daysAgo(2), visitType: "NEW", operationId: cerCrown!.id, operationRate: 8000, doctorId: ramana!.id, doctorCommissionPercent: 75, labId: lab7!.id, labRateAmount: 550 },
    { caseNo: 80007, patientId: 7, visitDate: daysAgo(3), visitType: "NEW", operationId: bleaching!.id, operationRate: 3000, doctorId: anitha!.id, doctorCommissionPercent: 70 },
    { caseNo: 80008, patientId: 8, visitDate: daysAgo(3), visitType: "NEW", operationId: implant!.id, operationRate: 25000, doctorId: bhadra!.id, commissionRate: 750, labRateAmount: 3000 },
    { caseNo: 80009, patientId: 9, visitDate: daysAgo(4), visitType: "NEW", operationId: xray!.id, operationRate: 50, doctorId: kazim!.id, doctorCommissionPercent: 0 },
    { caseNo: 80010, patientId: 10, visitDate: daysAgo(5), visitType: "NEW", operationId: flap!.id, operationRate: 6000, doctorId: surender!.id, doctorCommissionPercent: 50, discount: 1000 },
    // Last week
    { caseNo: 80011, patientId: 11, visitDate: daysAgo(7), visitType: "NEW", operationId: regCons!.id, operationRate: 100, doctorId: kazim!.id, doctorCommissionPercent: 0 },
    { caseNo: 80012, patientId: 12, visitDate: daysAgo(7), visitType: "NEW", operationId: rct!.id, operationRate: 4500, doctorId: ramana!.id, doctorCommissionPercent: 75 },
    { caseNo: 80013, patientId: 13, visitDate: daysAgo(8), visitType: "NEW", operationId: cerCrown!.id, operationRate: 7500, doctorId: anitha!.id, doctorCommissionPercent: 70, labId: lab7!.id, labRateAmount: 550, labQuantity: 2 },
    { caseNo: 80014, patientId: 14, visitDate: daysAgo(9), visitType: "NEW", operationId: scaling!.id, operationRate: 1200, doctorId: surender!.id, doctorCommissionPercent: 50 },
    { caseNo: 80015, patientId: 15, visitDate: daysAgo(10), visitType: "NEW", operationId: filling!.id, operationRate: 600, doctorId: kazim!.id, doctorCommissionPercent: 0 },
    // Older visits with outstanding balances
    { caseNo: 80016, patientId: 16, visitDate: daysAgo(15), visitType: "NEW", operationId: implant!.id, operationRate: 30000, doctorId: bhadra!.id, labRateAmount: 5000 },
    { caseNo: 80017, patientId: 17, visitDate: daysAgo(20), visitType: "NEW", operationId: cerCrown!.id, operationRate: 12000, doctorId: ramana!.id, doctorCommissionPercent: 75, labId: lab7!.id, labRateAmount: 550, labQuantity: 3 },
    { caseNo: 80018, patientId: 18, visitDate: daysAgo(25), visitType: "NEW", operationId: rct!.id, operationRate: 5000, doctorId: anitha!.id, doctorCommissionPercent: 70 },
    { caseNo: 80019, patientId: 19, visitDate: daysAgo(30), visitType: "NEW", operationId: extraction!.id, operationRate: 1500, doctorId: surender!.id, doctorCommissionPercent: 50 },
    { caseNo: 80020, patientId: 20, visitDate: daysAgo(35), visitType: "NEW", operationId: bleaching!.id, operationRate: 4000, doctorId: ramana!.id, doctorCommissionPercent: 75 },
  ];

  for (const v of visits) {
    const { commissionRate, ...visitData } = v as typeof v & { commissionRate?: number };
    await prisma.visit.create({ data: visitData });
  }

  // ==========================================
  // SAMPLE RECEIPTS
  // ==========================================
  const receipts = [
    // Fully paid visits
    { visitId: 1, receiptDate: today, amount: 100, paymentMode: "Cash" },
    { visitId: 2, receiptDate: today, amount: 1500, paymentMode: "UPI" },
    { visitId: 3, receiptDate: today, amount: 3000, paymentMode: "Card" }, // partial payment (4500 billed)
    { visitId: 4, receiptDate: daysAgo(1), amount: 800, paymentMode: "Cash" },
    { visitId: 5, receiptDate: daysAgo(1), amount: 1200, paymentMode: "NEFT" },
    { visitId: 6, receiptDate: daysAgo(2), amount: 5000, paymentMode: "Card" }, // partial (8000 billed)
    { visitId: 7, receiptDate: daysAgo(3), amount: 3000, paymentMode: "UPI" },
    { visitId: 8, receiptDate: daysAgo(3), amount: 10000, paymentMode: "Card" }, // partial (25000 billed)
    { visitId: 9, receiptDate: daysAgo(4), amount: 50, paymentMode: "Cash" },
    { visitId: 10, receiptDate: daysAgo(5), amount: 5000, paymentMode: "UPI" }, // fully paid (6000-1000 discount)
    { visitId: 11, receiptDate: daysAgo(7), amount: 100, paymentMode: "Cash" },
    { visitId: 12, receiptDate: daysAgo(7), amount: 4500, paymentMode: "Cheque" },
    { visitId: 13, receiptDate: daysAgo(8), amount: 4000, paymentMode: "Card" }, // partial (7500 billed)
    { visitId: 14, receiptDate: daysAgo(9), amount: 1200, paymentMode: "Cash" },
    { visitId: 15, receiptDate: daysAgo(10), amount: 600, paymentMode: "Cash" },
    // Outstanding visits - partial payments
    { visitId: 16, receiptDate: daysAgo(15), amount: 15000, paymentMode: "Card" }, // 15000 outstanding
    { visitId: 17, receiptDate: daysAgo(20), amount: 5000, paymentMode: "NEFT" }, // 7000 outstanding
    { visitId: 18, receiptDate: daysAgo(25), amount: 2000, paymentMode: "Cash" }, // 3000 outstanding
    // No receipts for visits 19 and 20 — fully outstanding
  ];

  // Add receiptNo sequentially
  let receiptNo = 1;
  for (const r of receipts) {
    await prisma.receipt.create({
      data: { ...r, receiptNo: receiptNo++ },
    });
  }

  // ==========================================
  // MULTI-RECEIPT CHECKOUT SCENARIOS (for commission testing)
  // ==========================================
  // Give patient 20 (AHMED KHAN, id=20) extra visits for a checkout scenario
  const patient20Visits = [
    { caseNo: 80021, patientId: 20, visitDate: daysAgo(12), operationId: rct!.id, operationRate: 6000, doctorId: ramana!.id, doctorCommissionPercent: 75 },
    { caseNo: 80022, patientId: 20, visitDate: daysAgo(10), operationId: cerCrown!.id, operationRate: 8000, doctorId: anitha!.id, doctorCommissionPercent: 70, labId: lab7!.id, labRateAmount: 550 },
  ];
  for (const v of patient20Visits) {
    await prisma.visit.create({ data: v });
  }

  // Checkout scenario 1: Patient 20 pays ₹5,000 across visits 80020 (bleaching, ₹4,000 outstanding)
  // and 80021 (RCT, ₹6,000 outstanding) — split ₹4,000 + ₹1,000
  await prisma.receipt.create({ data: { visitId: 20, amount: 4000, paymentMode: "Cash", receiptDate: daysAgo(5), receiptNo: receiptNo++ } });
  await prisma.receipt.create({ data: { visitId: 21, amount: 1000, paymentMode: "Cash", receiptDate: daysAgo(5), receiptNo: receiptNo++ } });

  // Checkout scenario 2: Patient 18 (RAVI KUMAR) pays ₹3,000 all against visit 80018 (RCT, ₹3,000 outstanding)
  await prisma.receipt.create({ data: { visitId: 18, amount: 3000, paymentMode: "UPI", receiptDate: daysAgo(3), receiptNo: receiptNo++ } });

  // ==========================================
  // FOLLOW-UP VISIT CHAINS (demonstrating visitType + parentVisitId)
  // ==========================================

  // Patient 10001 (id=1): RCT chain — 3 visits
  // Parent: NEW visit for RCT started 14 days ago
  const rctParent = await prisma.visit.create({
    data: {
      caseNo: 80023, patientId: 1, visitDate: daysAgo(14), visitType: "NEW",
      operationId: rct!.id, operationRate: 5000, doctorId: surender!.id, doctorCommissionPercent: 50,
    },
  });
  // Follow-up 1: BMP (bio-mechanical preparation) - 7 days ago
  await prisma.visit.create({
    data: {
      caseNo: 80024, patientId: 1, visitDate: daysAgo(7), visitType: "FOLLOWUP",
      parentVisitId: rctParent.id,
      operationId: compFilling!.id, operationRate: 0, doctorId: surender!.id, doctorCommissionPercent: 50,
    },
  });
  // Follow-up 2: Obturation - 2 days ago
  await prisma.visit.create({
    data: {
      caseNo: 80025, patientId: 1, visitDate: daysAgo(2), visitType: "FOLLOWUP",
      parentVisitId: rctParent.id,
      operationId: rct!.id, operationRate: 0, doctorId: surender!.id, doctorCommissionPercent: 50,
      notes: "Obturation complete. Crown prep next visit.",
    },
  });

  // Patient 10002 (id=2): Ortho chain — NEW + 3 monthly adjustments at rate=0
  const orthoParent = await prisma.visit.create({
    data: {
      caseNo: 80026, patientId: 2, visitDate: daysAgo(90), visitType: "NEW",
      operationId: ortho!.id, operationRate: 35000, doctorId: anitha!.id, doctorCommissionPercent: 70,
    },
  });
  for (let i = 1; i <= 3; i++) {
    await prisma.visit.create({
      data: {
        caseNo: 80026 + i, patientId: 2, visitDate: daysAgo(90 - i * 30), visitType: "FOLLOWUP",
        parentVisitId: orthoParent.id,
        operationId: ortho!.id, operationRate: 0, doctorId: anitha!.id, doctorCommissionPercent: 70,
        notes: `Monthly adjustment #${i}`,
      },
    });
  }

  // Patient 10003 (id=3): NEW visit + REVIEW 2 weeks later
  const consParent = await prisma.visit.create({
    data: {
      caseNo: 80030, patientId: 3, visitDate: daysAgo(21), visitType: "NEW",
      operationId: filling!.id, operationRate: 800, doctorId: ramana!.id, doctorCommissionPercent: 75,
    },
  });
  await prisma.visit.create({
    data: {
      caseNo: 80031, patientId: 3, visitDate: daysAgo(7), visitType: "REVIEW",
      parentVisitId: consParent.id,
      operationId: regCons!.id, operationRate: 0, doctorId: ramana!.id, doctorCommissionPercent: 75,
      notes: "Post-filling review. No sensitivity. Patient doing well.",
    },
  });

  // Clinical reports for follow-up visits
  await prisma.clinicalReport.create({
    data: {
      visitId: rctParent.id, doctorId: surender!.id, reportDate: daysAgo(14),
      complaint: "PAIN IN LOWER RIGHT MOLAR",
      examination: "Deep caries in 46 with periapical radiolucency. Tender on percussion.",
      diagnosis: "Irreversible pulpitis with periapical abscess — 46",
      treatmentNotes: "1. Access opening done\n2. Working length determined\n3. Canals irrigated with NaOCl\n4. Calcium hydroxide dressing placed",
      medication: "Tab Amoxicillin 500mg TID x 5 days\nTab Ibuprofen 400mg SOS",
    },
  });

  // ==========================================
  // PATIENT DISEASES (medical history for some patients)
  // ==========================================
  const patientDiseases = [
    { patientId: 1, diseaseId: 8 }, // Diabetes
    { patientId: 2, diseaseId: 2 }, // High BP
    { patientId: 2, diseaseId: 1 }, // Heart Disease
    { patientId: 15, diseaseId: 8 }, // Diabetes
    { patientId: 15, diseaseId: 2 }, // High BP
    { patientId: 20, diseaseId: 2 }, // High BP
    { patientId: 22, diseaseId: 8 }, // Diabetes
    { patientId: 22, diseaseId: 15 }, // Arthritis
    { patientId: 30, diseaseId: 16 }, // Allergies
    { patientId: 39, diseaseId: 1 }, // Heart Disease
    { patientId: 39, diseaseId: 2 }, // High BP
    { patientId: 46, diseaseId: 8 }, // Diabetes
  ];
  await prisma.patientDisease.createMany({ data: patientDiseases });

  // ==========================================
  // DOCTOR COMMISSION HISTORY
  // ==========================================
  const commHistory = [
    { doctorId: 3, periodFrom: new Date("2002-11-01"), periodTo: new Date("2004-08-31"), commissionPercent: 45 },
    { doctorId: 3, periodFrom: new Date("2004-09-01"), periodTo: new Date("2099-12-31"), commissionPercent: 50 },
    { doctorId: 5, periodFrom: new Date("2001-06-01"), periodTo: new Date("2099-12-31"), commissionPercent: 70 },
    { doctorId: 6, periodFrom: new Date("2002-11-01"), periodTo: new Date("2099-12-31"), commissionPercent: 50 },
    { doctorId: 16, periodFrom: new Date("2003-01-01"), periodTo: new Date("2099-12-31"), commissionPercent: 60 },
  ];
  await prisma.doctorCommissionHistory.createMany({ data: commHistory });

  // ==========================================
  // LAB RATES (sample for SAI DENTAL LAB - lab 7)
  // ==========================================
  const labRates = [
    { labId: 7, itemCode: 1, itemName: "CER CROWN", rate: 550 },
    { labId: 7, itemCode: 2, itemName: "N.C CROWN", rate: 160 },
    { labId: 7, itemCode: 3, itemName: "CER BRIDGE", rate: 550 },
    { labId: 7, itemCode: 4, itemName: "CER FACING", rate: 400 },
    { labId: 7, itemCode: 6, itemName: "TEMPORARY", rate: 40 },
    { labId: 7, itemCode: 7, itemName: "BLEACHING TRAY", rate: 500 },
    { labId: 7, itemCode: 8, itemName: "C.D.", rate: 0 },
    { labId: 7, itemCode: 9, itemName: "RPD", rate: 0 },
    { labId: 7, itemCode: 10, itemName: "SPLINT", rate: 0 },
    { labId: 7, itemCode: 11, itemName: "3D CERAMIC", rate: 800 },
    { labId: 7, itemCode: 12, itemName: "REPAIR", rate: 0 },
    { labId: 7, itemCode: 13, itemName: "NIGHT GUARD", rate: 0 },
    { labId: 7, itemCode: 14, itemName: "ALL CERAMIC", rate: 0 },
    { labId: 7, itemCode: 15, itemName: "APPLIANCE", rate: 0 },
    { labId: 7, itemCode: 16, itemName: "3D DESIGN CERAMIC", rate: 900 },
    { labId: 7, itemCode: 17, itemName: "VALPLAST", rate: 0 },
    { labId: 7, itemCode: 18, itemName: "F.P.D.", rate: 0 },
    { labId: 7, itemCode: 19, itemName: "LAMINATES", rate: 0 },
    { labId: 7, itemCode: 20, itemName: "COPING", rate: 0 },
    // A few for other labs
    { labId: 2, itemCode: 1, itemName: "CER CROWN", rate: 600 },
    { labId: 2, itemCode: 2, itemName: "N.C CROWN", rate: 160 },
    { labId: 2, itemCode: 3, itemName: "CER FACING", rate: 430 },
    { labId: 2, itemCode: 4, itemName: "CER BRIDGE", rate: 600 },
    { labId: 6, itemCode: 1, itemName: "CER CROWN", rate: 500 },
    { labId: 6, itemCode: 2, itemName: "CER FACING", rate: 400 },
    { labId: 6, itemCode: 3, itemName: "CER BRIDGE", rate: 500 },
    { labId: 6, itemCode: 4, itemName: "N.C CROWN", rate: 150 },
    { labId: 9, itemCode: 1, itemName: "CER CROWN", rate: 600 },
    { labId: 9, itemCode: 2, itemName: "CER BRIDGE", rate: 600 },
    { labId: 9, itemCode: 3, itemName: "CER FACING", rate: 400 },
  ];
  // Lab IDs are auto-incremented, need to map code to actual IDs
  for (const lr of labRates) {
    const lab = await prisma.lab.findFirst({ where: { code: lr.labId } });
    if (lab) {
      await prisma.labRate.create({
        data: { ...lr, labId: lab.id },
      });
    }
  }

  // ==========================================
  // CLINICAL REPORTS (sample examination data)
  // ==========================================
  const clinicalReports = [
    {
      visitId: 1, // REG/CONS for patient 10001
      doctorId: kazim!.id,
      reportDate: today,
      complaint: "REGULAR CHECKUP",
      examination: "Generalized calculus deposits, mild gingivitis. Caries noted in 36 (mesial), 46 (occlusal). Missing 18, 28.",
      diagnosis: "Generalized chronic gingivitis, dental caries 36, 46",
      treatmentNotes: "1. Scaling and polishing\n2. Composite filling 36, 46\n3. Review after 6 months",
      estimate: "Scaling: ₹1,500\nFillings: ₹800 x 2 = ₹1,600\nTotal: ₹3,100",
      medication: null,
    },
    {
      visitId: 3, // RCT for patient 10003
      doctorId: ramana!.id,
      reportDate: today,
      complaint: "PAIN, SENSITIVITY",
      examination: "Deep caries in 36, tender on percussion, periapical radiolucency on IOPA. Vitality test negative. No swelling or sinus tract.",
      diagnosis: "Irreversible pulpitis with periapical abscess — 36",
      treatmentNotes: "1. RCT for 36 (3 visits)\n2. Ceramic crown after RCT completion\n3. Scaling for generalized calculus",
      estimate: "RCT: ₹5,000\nCeramic Crown: ₹8,000\nScaling: ₹1,500\nTotal estimate: ₹14,500",
      medication: "Tab Amoxicillin 500mg TID x 5 days\nTab Ibuprofen 400mg SOS for pain\nCap Omeprazole 20mg OD x 5 days",
    },
    {
      visitId: 6, // CER CROWN for patient 10006
      doctorId: ramana!.id,
      reportDate: daysAgo(2),
      complaint: "FOLLOW UP",
      examination: "Post-RCT 46 — satisfactory obturation on IOPA. Tooth prepared for crown. Impression taken.",
      diagnosis: "Post-RCT 46 — ready for crown",
      treatmentNotes: "1. Crown cementation scheduled in 5 days\n2. Temporary crown placed\n3. Avoid hard foods on left side",
      estimate: "Ceramic crown: ₹8,000 (included in treatment plan)",
      medication: null,
    },
    {
      visitId: 7, // Bleaching for patient 10007
      doctorId: anitha!.id,
      reportDate: daysAgo(3),
      complaint: "DISCOLORATION",
      examination: "Generalized mild to moderate tooth discoloration. No active caries. Good oral hygiene. Mild calculus in lower anteriors.",
      diagnosis: "Extrinsic tooth staining",
      treatmentNotes: "1. In-office bleaching performed today (Zoom whitening)\n2. Home bleaching kit provided for 2 weeks\n3. Avoid tea, coffee, colored foods for 48 hours\n4. Follow-up in 2 weeks",
      estimate: null,
      medication: "Desensitizing toothpaste (Sensodyne) for 2 weeks if sensitivity occurs",
    },
  ];

  for (const cr of clinicalReports) {
    await prisma.clinicalReport.create({ data: cr });
  }

  // ==========================================
  // SAMPLE PATIENT FILES (file records — actual files won't exist on disk)
  // ==========================================
  const patientFiles = [
    // Patient 10001 (id=1) — files linked to visit 1
    { patientId: 1, visitId: 1, filePath: "/uploads/patients/1/xray-upper-left.jpg", fileName: "xray-upper-left.jpg", description: "Upper left molar X-ray", fileType: "jpg", uploadedById: kazim!.id },
    { patientId: 1, visitId: 1, filePath: "/uploads/patients/1/opg-scan-feb2026.pdf", fileName: "opg-scan-feb2026.pdf", description: "Full mouth OPG scan", fileType: "pdf", uploadedById: kazim!.id },
    // Patient 10001 — patient-level file (no visitId)
    { patientId: 1, filePath: "/uploads/patients/1/consent-form-signed.pdf", fileName: "consent-form-signed.pdf", description: "Treatment consent form", fileType: "pdf", uploadedById: kazim!.id },
    // Patient 10003 (id=3) — files linked to visit 3 (RCT)
    { patientId: 3, visitId: 3, filePath: "/uploads/patients/3/clinical-photo-tooth36.png", fileName: "clinical-photo-tooth36.png", description: "Pre-op photo of tooth #36", fileType: "png", uploadedById: ramana!.id },
    { patientId: 3, visitId: 3, filePath: "/uploads/patients/3/iopa-tooth36.jpg", fileName: "iopa-tooth36.jpg", description: "IOPA radiograph tooth #36", fileType: "jpg", uploadedById: ramana!.id },
    { patientId: 3, filePath: "/uploads/patients/3/medical-history-form.pdf", fileName: "medical-history-form.pdf", description: "Medical history questionnaire", fileType: "pdf", uploadedById: kazim!.id },
    // Patient 10006 (id=6) — files linked to visit 6 (CER CROWN)
    { patientId: 6, visitId: 6, filePath: "/uploads/patients/6/crown-shade-photo.jpg", fileName: "crown-shade-photo.jpg", description: "Shade matching photo", fileType: "jpg", uploadedById: ramana!.id },
    { patientId: 6, visitId: 6, filePath: "/uploads/patients/6/impression-scan.pdf", fileName: "impression-scan.pdf", description: "Digital impression report", fileType: "pdf", uploadedById: ramana!.id },
    // Patient 10007 (id=7) — file linked to visit 7 (Bleaching)
    { patientId: 7, visitId: 7, filePath: "/uploads/patients/7/before-bleaching.jpg", fileName: "before-bleaching.jpg", description: "Before bleaching photo", fileType: "jpg", uploadedById: anitha!.id },
    { patientId: 7, visitId: 7, filePath: "/uploads/patients/7/after-bleaching.jpg", fileName: "after-bleaching.jpg", description: "After bleaching photo", fileType: "jpg", uploadedById: anitha!.id },
  ];

  for (const pf of patientFiles) {
    await prisma.patientFile.create({ data: pf });
  }

  console.log("✅ Database seeded successfully!");
  console.log("   - 2 designations");
  console.log("   - 18 diseases");
  console.log(`   - ${operations.length} operations`);
  console.log(`   - ${labs.length} labs`);
  console.log(`   - ${doctors.length} doctors`);
  console.log(`   - ${patients.length} patients`);
  console.log(`   - ${visits.length + 10} visits (incl. follow-up chains)`);
  console.log(`   - ${receipts.length} receipts`);
  console.log(`   - ${clinicalReports.length + 1} clinical reports`);
  console.log(`   - ${patientFiles.length} patient files`);
  console.log("   - 1 clinic settings");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
