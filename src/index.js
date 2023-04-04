import App from "./App.svelte";

let data = {
	"": {
		"font-link":
			"https://fonts.googleapis.com/css2?family=Titillium+Web&display=swap",
		"font-style": "font-family: 'Titillium Web', sans-serif;",
		label: {
			"": {
				title: "Invoice",
				ref: "No",
				date: "Date",
				duedate: "Due Date",
				vendor: "Vendor",
				client: "Bill to",
				paymethod: "Payment",
				subject: "Project",
				itemNo: "No",
				itemDesc: "Description",
				itemPrice: "Price",
				itemQty: "Qty",
				itemAmount: "Amount",
				totalAmount: "Subtotal",
				totalVat: "Vat",
				totalWht: "Tax withheld",
				totalAdjust: "Adjust",
				totalFinal: "Pay Amount",
				note: "Note",
				vendorSign: "Vendor Signature",
				clientSign: "Client Signature",
				thankMessage: "Thank You"
			},
			quotation: {
				title: "Quotation",
				duedate: "Offer Until",
				client: "Offer to"
			},
			receipt: {
				title: "Receipt",
				client: "Received from",
				totalFinal: "Paid Amount",
				vendor: "Receiver",
				vendorSign: "Receiver Signature"
			},
			"tax-invoice": {
				title: "Tax Invoice"
			}
		},
		q: {
			lang: "",
			doc: "",
			currency: "$",
			vendorLogo: "",
			ref: Math.random().toString().slice(2, 10),
			date: new Date().toLocaleDateString(undefined),
			duedate: "",
			vendorName: "Vendor Name",
			vendorId: "Register",
			vendorAddress: "Address",
			clientName: "Client Name",
			clientId: "Register",
			clientAddress: "Address",
			paymethod: "",
			subject: "",
			itemDesc: ["", "", "", "", "", ""],
			itemPrice: ["", "", "", "", "", ""],
			itemQty: ["", "", "", "", "", ""],
			vatRate: "0.05",
			whtRate: "0",
			totalAdjust: "",
			note: ""
		}
	},

	th: {
		"font-link": "https://fonts.googleapis.com/css2?family=Athiti&display=swap",
		"font-style": "font-family: 'Athiti', sans-serif;",
		label: {
			"": {
				title: "ใบแจ้งหนี้",
				ref: "เลขที่",
				date: "วันที่",
				duedate: "ชำระภายใน",
				vendor: "ผู้ขาย",
				client: "ส่งถึง",
				paymethod: "วิธีชำระเงิน",
				subject: "งาน",
				itemNo: "#",
				itemDesc: "รายการ",
				itemPrice: "ราคา",
				itemQty: "จำนวน",
				itemAmount: "จำนวนเงิน",
				totalAmount: "รวม",
				totalVat: "ภาษีมูลค่าเพิ่ม",
				totalWht: "หัก ณ ที่จ่าย",
				totalAdjust: "ปรับปรุง",
				totalFinal: "ยอดชำระ",
				note: "หมายเหตุ",
				vendorSign: "ลายเซ็นผู้ขาย",
				clientSign: "ลายเซ็นผู้ซื้อ",
				thankMessage: ""
			},
			quotation: {
				title: "ใบเสนอราคา",
				duedate: "สั่งซื้อก่อนวันที่",
				client: "ส่งถึง"
			},
			receipt: {
				title: "ใบเสร็จรับเงิน",
				client: "รับเงินจาก",
				totalFinal: "ยอดชำระ",
				vendorSign: "ลายเซ็นผู้รับเงิน",
				vendor: "ผู้รับเงิน"
			},
			"tax-invoice": {
				title: "ใบกำกับภาษี"
			}
		},
		q: {
			lang: "th",
			doc: "",
			currency: "฿",
			vendorLogo: "",
			ref: Math.random().toString().slice(2, 10),
			date: new Date().toLocaleDateString("th"),
			duedate: "",
			vendorName: "ชื่อผู้ขาย",
			vendorId: "เลขประจำตัว",
			vendorAddress: "ที่อยู่",
			clientName: "ชื่อลูกค้า",
			clientId: "เลขประจำตัว",
			clientAddress: "ที่อยู่",
			paymethod: "",
			subject: "",
			itemDesc: ["", "", "", "", "", ""],
			itemPrice: ["", "", "", "", "", ""],
			itemQty: ["", "", "", "", "", ""],
			vatRate: "0.07",
			whtRate: "0",
			totalAdjust: "",
			note: ""
		}
	}
};

const app = new App({
	target: document.getElementById("_app"),
	props: {
		data
	}
});

export default app;
