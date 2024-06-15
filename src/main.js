import { mount } from "svelte";
import App from "./App.svelte";
import "./style.css";

let data = {
  "": {
    local: "English",
    fontLink: "https://fonts.googleapis.com/css2?family=Titillium+Web&display=swap",
    fontFamily: "'Titillium Web', sans-serif",
    "": {
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
        thankMessage: "Thank You",
      },
      quotation: {
        title: "Quotation",
        duedate: "Offer Until",
        client: "Offer to",
      },
      receipt: {
        title: "Receipt",
        client: "Received from",
        totalFinal: "Paid Amount",
        vendor: "Receiver",
        vendorSign: "Receiver Signature",
      },
      "tax-invoice": {
        title: "Tax Invoice",
      },
    },
  },

  th: {
    local: "ภาษาไทย",
    fontLink: "https://fonts.googleapis.com/css2?family=Athiti&display=swap",
    fontFamily: "'Athiti', sans-serif",
    "": {
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
        thankMessage: "",
      },
      quotation: {
        title: "ใบเสนอราคา",
        duedate: "สั่งซื้อก่อนวันที่",
        client: "ส่งถึง",
      },
      receipt: {
        title: "ใบเสร็จรับเงิน",
        client: "รับเงินจาก",
        totalFinal: "ยอดชำระ",
        vendorSign: "ลายเซ็นผู้รับเงิน",
        vendor: "ผู้รับเงิน",
      },
      "tax-invoice": {
        title: "ใบกำกับภาษี",
      },
    },
  },
};

const app = mount(App, {
  target: document.querySelector("#app"),
  props: {
    data,
  },
});

export default app;
