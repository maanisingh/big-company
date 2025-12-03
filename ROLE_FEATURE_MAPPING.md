# BIG Company - Role & Feature Mapping

## Clear Separation of Portals

### ❌ CONSUMER Portal (existing)
This is for END CUSTOMERS who buy products from retailers
- Shop
- Orders
- Wallet
- Gas Top-up
- Rewards
- NFC Cards

---

### ✅ ADMIN/EMPLOYER Portal (NEW - to be built)
This is for COMPANY MANAGEMENT to run the business
**Who uses this:** Business owners, HR managers, Finance managers

#### Features:
1. **Employees Management** ✓
   - Add/Edit/Delete employees
   - View employee details
   - Manage employee documents
   - Set salaries and benefits

2. **Vendors Management** ✓
   - Add/Edit/Delete vendors
   - Vendor invoices
   - Pay vendors via direct deposit

3. **Payroll Processing** ✓
   - Calculate salaries
   - Process payroll monthly
   - Automatic bill payment deductions
   - Direct deposit to employee bank accounts
   - Generate payslips
   - Tax calculations

4. **Attendance Management** ✓
   - View all employees' attendance
   - Approve/reject leave requests
   - Generate attendance reports
   - Manage shifts and schedules

5. **Projects Management** ✓
   - Create and manage projects
   - Assign employees to projects
   - Track project progress
   - Budget management

6. **Deals/Sales Pipeline** ✓
   - Manage sales deals
   - Track deal stages
   - Sales forecasting
   - Revenue reporting

7. **Bill Payment Companies Management** ✓
   - Create master list of bill payment companies
   - Manage company details and bank accounts
   - View all employees' bill payment setups

---

### ✅ EMPLOYEE Portal (NEW - to be built)
This is for STAFF MEMBERS who work for the company
**Who uses this:** Employees, workers, staff

#### Features (LIMITED ACCESS):
1. **My Attendance** ✓
   - Check in/Check out
   - View my attendance history
   - See hours worked

2. **Leave Management** ✓
   - Request leave (vacation, sick, personal)
   - View my leave balance
   - Track leave status

3. **My Payslips** ✓
   - View monthly payslips
   - Download pay stubs
   - See deductions breakdown

4. **Bill Payments** ✓ **CRITICAL FEATURE**
   - Add up to 2000 bill payment companies
   - Manage my bill payments:
     * Water bill
     * Electricity bill
     * Internet/Phone bill
     * Loan payments
     * Insurance payments
     * Rent
     * School fees
     * etc.
   - Set monthly amount for each bill
   - View which bills will be deducted from next salary
   - See payment history

5. **My Projects** ✓
   - View assigned projects (read-only)
   - View my tasks
   - Log time worked

6. **My Profile** ✓
   - Update personal information
   - Manage bank account for direct deposit
   - Upload documents

---

## Key Differences

| Feature | Consumer | Admin/Employer | Employee |
|---------|----------|----------------|----------|
| Shopping | ✓ | ✗ | ✗ |
| Orders | ✓ | ✗ | ✗ |
| Gas Top-up | ✓ | ✗ | ✗ |
| Rewards | ✓ | ✗ | ✗ |
| Manage Employees | ✗ | ✓ | ✗ |
| Process Payroll | ✗ | ✓ | ✗ |
| Manage Vendors | ✗ | ✓ | ✗ |
| View All Attendance | ✗ | ✓ | ✗ |
| Manage Projects | ✗ | ✓ | ✗ |
| Manage Deals | ✗ | ✓ | ✗ |
| My Attendance | ✗ | ✗ | ✓ |
| Request Leave | ✗ | ✗ | ✓ |
| View My Payslips | ✗ | ✗ | ✓ |
| Manage My Bill Payments | ✗ | ✗ | ✓ |
| View Assigned Projects | ✗ | ✗ | ✓ |

---

## User Roles in System

1. **consumer** - End customers (existing)
2. **admin** - Company management/HR (NEW)
3. **employee** - Staff members (NEW)
4. **retailer** - Shop owners (existing)
5. **wholesaler** - Suppliers (existing)

---

## Important Notes for Implementation

1. **Payroll is ONLY for admin** - Employees can only VIEW their own payslips
2. **Vendors are ONLY for admin** - Not accessible to employees
3. **Deals are ONLY for admin** - Business sales management
4. **Bill Payments:**
   - Admin can view the master list of bill companies
   - Admin can see which employees have bill payments set up
   - Employees can add/manage their OWN bill payments (up to 2000 companies)
   - System automatically deducts bill payments from salary during payroll processing

5. **Direct Deposit:**
   - Admin processes payroll with direct deposit
   - System automatically:
     * Calculates net pay
     * Deducts bill payments
     * Sends remaining salary to employee bank account
     * Sends bill payments to respective company accounts

---

## Next Implementation Steps

1. Add 'employee' role to auth system
2. Create employee portal routes
3. Create admin portal routes (separate from existing admin)
4. Build employee management for admin
5. Build bill payment system (master list + employee setup)
6. Build payroll module with direct deposit
7. Build attendance tracking
8. Build projects module
9. Build deals pipeline
