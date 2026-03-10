import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
	en: {
		translation: {
			user_title: "Hi",
			logout: "Logout",
			coming_soon: "Coming soon",
			more_coming_soon: "More features coming soon",
			privacy_concern: "Worried about your data?",
			bills_loaded: "Data loaded",
			//HOME
			//summary card
			home_title: "Home",
			total_commitment: "Total Commitment (estimate)",
			paid: "Paid",
			remaining: "Remaining",
			//stats card
			total_paid: "Paid",
			total_bill: "Bill",
			total_unpaid: "Unpaid",
			underpaid_bills: "Underpaid bills",
			overpaid_bills: "Overpaid bills",
			paid_exact: "Paid exact amount",
			not_paid_yet: "Not paid yet",
			//BILL
			// add new bill button
			bills: "bills",
			payment_breakdown: "Payment Breakdown",
			bill_title: "Bill",
			add_new_bill: "Add New Bill",
			cancel: "Cancel",
			save_bill: "Save Bill",
			// add bill form
			bill_name: "Bill Name",
			tooltip_bill_name: "Enter the name of the bill (e.g., Internet, Rent)",
			tooltip_amount: "Enter the monthly amount you need to pay",
			tooltip_due_day: "Enter the day of the month this bill is due (1-31)",
			tooltip_start_date: "Select the date when this bill starts",
			tooltip_duration:
				"Optional: Enter how many months this bill lasts (leave empty for ongoing)",
			example_netflix: "e.g. Netflix",
			due: "Due",
			day: "Day",
			paid_status: "PAID",
			amount: "Amount",
			due_day: "Payment Day",
			start_date: "Created Date",
			duration_months: "Duration (Months)",
			optional: "Optional",
			no_bills_found: "No Bills Found",
			loading_bills: "Fetching",
			paid_amount: "Paid Amount",
			full: "Full",
			confirm_payment: "Confirm Payment",
			amount_to_pay: "Amount to pay",
			confirm: "Confirm",
			category_water: "Water",
			category_electric: "Electric",
			category_internet: "Internet",
			category_phone: "Phone",
			category_rent: "Rent",
			category_maintenance: "Maintenance",
			category_loan: "Loan",
			category_credit_card: "Credit Card",
			category_insurance: "Insurance",
			category_investment: "Investment",
			category_installment: "Installment",
			category_streaming: "Streaming",
			category_software: "Software",
			category_grocery: "Grocery",
			category_transport: "Transport",
			category_fuel: "Fuel",
			category_parking: "Parking",
			category_other: "Other",
			select_category: "Select a category",
			notes_placeholder: "e.g. paid via Maybank (optional)",
			notes: "Notes",
			category: "category",
			saving: "Saving...",
			tooltip_category:
				"Select the type of bill (e.g., utilities, rent, subscription)",
			//error messsage
			delete_bill_confirm: "Are you sure you want to delete this bill?",
			update_payment_error: "Error updating payment",
			failed_load_bill: "Could not load bills",
			failed_authenticate: "Authentication failed",
			loading: "Please wait...",
			amount_min_1: "Amount must be at least RM 1.00",
			warning_over_amount: "You're paying amount which exceeds the bill amount",
			//LOGIN
			login_title: "My Bills",
			login_description: "Manage monthly commitments",
			login_name: "Name",
			login_email: "Email",
			login_password: "Password",
			sign_in: "Sign In",
			created_account: "Create Account",
			login_info: "Already have an account? Sign in",
			signup_info: "Don't have an account? Sign up",

			//MENU
			menu_title: "Menu",

			//ANALYTIC
			analytics_title: "Analytic",
			language: "Language",
		},
	},
	my: {
		translation: {
			user_title: "Hai",
			logout: "Log Keluar",
			coming_soon: "Akan datang",
			more_coming_soon: "Lebih banyak akan datang",
			privacy_concern: "Risau tentang data anda?",
			bills_loaded: "Data berjaya dimuatkan",
			// HOME
			// summary card
			home_title: "Utama",
			total_commitment: "Jumlah Komitmen (anggaran)",
			paid: "Telah Dibayar",
			remaining: "Baki",

			// stats card
			total_paid: "Dibayar",
			total_bill: "Bil",
			total_unpaid: "Tidak dibayar",
			underpaid_bills: "Bil dibayar kurang",
			overpaid_bills: "Bil lebih bayar",
			paid_exact: "Dibayar jumlah tepat",
			not_paid_yet: "Belum dibayar",
			// BILL
			bills: "bil",
			payment_breakdown: "Pecahan Bayaran",
			bill_title: "Bil",
			add_new_bill: "Tambah Bil Baharu",
			cancel: "Batal",
			save_bill: "Simpan Bil",

			// add bill form
			bill_name: "Nama Bil",
			tooltip_bill_name: "Masukkan nama bil (contoh: Internet, Sewa)",
			tooltip_amount: "Masukkan jumlah bulanan yang perlu dibayar",
			tooltip_due_day: "Masukkan hari dalam bulan bil ini perlu dibayar (1-31)",
			tooltip_start_date: "Pilih tarikh bil ini bermula",
			tooltip_duration:
				"Pilihan: Masukkan berapa bulan bil ini berlangsung (biarkan kosong jika berterusan)",

			example_netflix: "contoh: Netflix",
			due: "Tertunggak",
			day: "Hari",
			paid_status: "DIBAYAR",
			amount: "Jumlah",
			due_day: "Hari Bayaran",
			start_date: "Tarikh Dicipta",
			duration_months: "Tempoh (Bulan)",
			optional: "Pilihan",
			no_bills_found: "Tiada Bil Dijumpai",
			loading_bills: "Mengambil Data",
			paid_amount: "Jumlah Dibayar",
			full: "Penuh",
			confirm_payment: "Sahkan Bayaran",
			amount_to_pay: "Jumlah untuk dibayar",
			confirm: "Sahkan",
			category_water: "Air",
			category_electric: "Elektrik",
			category_internet: "Internet",
			category_phone: "Telefon",
			category_rent: "Sewa",
			category_maintenance: "Penyelenggaraan",
			category_loan: "Pinjaman",
			category_credit_card: "Kad Kredit",
			category_insurance: "Insurans",
			category_investment: "Pelaburan",
			category_installment: "ansuran",
			category_streaming: "Penstriman",
			category_software: "Perisian",
			category_grocery: "Barangan Runcit",
			category_transport: "Pengangkutan",
			category_fuel: "Minyak",
			category_parking: "Parkir",
			category_other: "Lain-lain",
			select_category: "Pilih kategori",
			notes_placeholder: "contoh: dibayar melalui Maybank (pilihan)",
			notes: "Nota",
			category: "Kategori",
			tooltip_category: "Pilih jenis bil (contoh: utiliti, sewa, langganan)",
			saving: "Menyimpan...",
			// error message
			delete_bill_confirm: "Adakah anda pasti ingin memadam bil ini?",
			update_payment_error: "Ralat semasa mengemas kini bayaran",
			failed_load_bill: "Gagal memuatkan bil",
			failed_authenticate: "Pengesahan gagal",
			loading: "Sila tunggu...",
			amount_min_1: "Jumlah mesti sekurang-kurangnya RM 1.00",
			warning_over_amount: "Anda membayar jumlah yang melebihi jumlah bil",

			// LOGIN
			login_title: "Bil Saya",
			login_description: "Urus komitmen bulanan anda",
			login_name: "Nama",
			login_email: "Emel",
			login_password: "Kata Laluan",
			sign_in: "Log Masuk",
			created_account: "Cipta Akaun",
			login_info: "Sudah mempunyai akaun? Log masuk",
			signup_info: "Tiada akaun? Daftar",

			//MENU
			menu_title: "Menu",

			//ANALYTIC
			analytics_title: "Analitik",
			language: "Bahasa",
		},
	},
};

i18n.use(initReactI18next).init({
	resources,
	lng: localStorage.getItem("language") ?? "my", // default language my if not language token been set
	fallbackLng: "my",
	interpolation: {
		escapeValue: false, // react already safes from xss
	},
});

export default i18n;
