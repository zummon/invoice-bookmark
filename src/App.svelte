<script>
  import { onMount } from "svelte";

  let { data } = $props();

  let q = $state({
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
    adjust: "",
    note: "",
  });
  let saveink = $state(false);

  const price = (number) => {
    number = Number(number);
    if (number === 0 || isNaN(number)) {
      return "";
    }
    return `${q.currency} ${number.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximunFractionDigits: 2,
    })}`;
  };

  let l = $derived({
    ...data[q.lang].label[""],
    ...data[q.lang].label[q.doc],
  });
  let itemAmount = $derived(
    q.itemPrice.map((_, i) => {
      const num = Number(q.itemPrice[i]) * Number(q.itemQty[i]);
      return num ? num : "";
    })
  );
  let totalAmount = $derived(
    itemAmount.reduce((accum, amt) => {
      const num = Number(accum) + Number(amt);
      return num ? num : "";
    }, 0)
  );
  let totalVat = $derived(Number(totalAmount) * Number(q.vatRate));
  let totalWht = $derived(Number(totalAmount) * Number(q.whtRate));
  let totalFinal = $derived(Number(totalAmount) + Number(totalVat) + Number(totalWht) + Number(q.adjust));

  onMount(() => {
    const s = new URLSearchParams(location.search);
    let obj = { ...q };
    Object.keys(q).forEach((key) => {
      const values = s.getAll(key);
      if (values.length > 0) {
        if (Array.isArray(q[key])) {
          obj[key] = values;
          return;
        }
        obj[key] = values[0];
      }
    });
    q = { ...data[q.lang].q, ...obj };
  });

  $effect(() => {
    document.body.style.fontFamily = data[q.lang].fontStyleFamily;
  });
</script>

<svelte:head>
  <link href={data[q.lang].fontLink} rel="stylesheet" />
</svelte:head>

<div class="flex flex-wrap justify-center items-center my-4 print:hidden">
  {#each Object.keys(data) as lng, i (`lang-${i}`)}
    <button
      class="block duration-300 p-4 {q.lang === lng
        ? 'bg-green-500 text-gray-100'
        : 'text-gray-900 bg-gray-100 hover:bg-green-500 focus:bg-green-500 hover:text-gray-100 focus:text-gray-100'}"
      onclick={() => {
        q.lang = lng;
        if (lng == "th") {
          q.currency = "฿";
          q.date = new Date().toLocaleDateString("th");
          q.vendorName = "ชื่อผู้ขาย";
          q.vendorId = "เลขประจำตัว";
          q.vendorAddress = "ที่อยู่";
          q.clientName = "ชื่อลูกค้า";
          q.clientId = "เลขประจำตัว";
          q.clientAddress = "ที่อยู่";
          q.vatRate = "0.07";
        } else {
          q.currency = "$";
          q.date = new Date().toLocaleDateString(undefined);
          q.vendorName = "Vendor Name";
          q.vendorId = "Register";
          q.vendorAddress = "Address";
          q.clientName = "Client Name";
          q.clientId = "Register";
          q.clientAddress = "Address";
          q.vatRate = "0.05";
        }
      }}
    >
      {data[lng][""]}
    </button>
  {/each}
  {#each Object.keys(data[q.lang].label) as dc, i (`doc-${i}`)}
    <button
      class="block duration-300 p-4 {q.doc === dc
        ? 'bg-green-500 text-gray-100'
        : 'text-gray-900 bg-gray-100 hover:bg-green-500 focus:bg-green-500 hover:text-gray-100 focus:text-gray-100'}"
      onclick={() => {
        q.doc = dc;
      }}
    >
      {data[q.lang].label[dc].title}
    </button>
  {/each}
</div>

<div class="bg-white text-black max-w-[60rem] mx-auto print:max-w-none print:mx-0">
  <div class="grid grid-cols-2">
    <div class="">
      <div class="w-1/2 md:w-1/3 h-full p-2 mx-auto rounded-b-full shadow-lg {saveink ? '' : 'bg-green-400'}">
        <img class="my-auto" src={q.vendorLogo} alt="" width="" height="" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2 self-center">
      <h1 class="rounded text-center text-4xl border-b-2 border-green-400 text-green-400 shadow-md col-span-full p-3">
        {l.title}
      </h1>
      <div class=" text-right">{l.ref}</div>
      <div class="" contenteditable="true" bind:textContent={q.ref}></div>
      <div class=" text-right">{l.date}</div>
      <div class="" contenteditable="true" bind:textContent={q.date}></div>
      {#if q.doc !== "receipt"}
        <div class=" text-right">{l.duedate}</div>
        <div class="" contenteditable="true" bind:textContent={q.duedate}></div>
      {/if}
    </div>
  </div>
  <div class="grid grid-cols-2 gap-4 pl-6 pr-2">
    <div class="">
      <h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">
        {l.client}
      </h3>
      <h2 class="text-xl mb-2" contenteditable="true" bind:textContent={q.clientName}></h2>
      <p class="pl-3 mb-2" contenteditable="true" bind:textContent={q.clientId}></p>
      <p class="pl-3 mb-2" contenteditable="true" bind:textContent={q.clientAddress}></p>
    </div>
    <div class="">
      <h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">
        {l.paymethod}
      </h3>
      <p class="pl-3 mb-3" contenteditable="true" bind:textContent={q.paymethod}></p>
      <h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">
        {l.subject}
      </h3>
      <p class="pl-3" contenteditable="true" bind:textContent={q.subject}></p>
    </div>
  </div>
  <table class="w-full my-3">
    <thead class="text-center">
      <tr class="text-white">
        <td class="p-2 rounded shadow-md w-px whitespace-nowrap {saveink ? 'text-green-400' : 'bg-green-400'}"
          >{l.itemNo}</td
        >
        <td class="rounded shadow-md {saveink ? 'text-green-400' : 'bg-green-400'}">
          <div class="flex">
            <p class="p-2 flex-grow">{l.itemDesc}</p>
            <button
              class="p-2 focus:bg-black/25 hover:bg-black/25 rounded-full transition duration-300 ease-in-out print:hidden"
              onclick={() => {
                q.itemDesc.push("");
                q.itemPrice.push("");
                q.itemQty.push("");
              }}
            >
              <!-- heroicons solid duplicate -->
              <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
              </svg>
            </button>
            <button
              class="p-2 focus:bg-black/25 hover:bg-black/25 rounded-full transition duration-300 ease-in-out print:hidden"
              onclick={() => {
                q.itemDesc.pop();
                q.itemPrice.pop();
                q.itemQty.pop();
              }}
            >
              <!-- heroicons solid trash -->
              <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        </td>
        <td class="p-2 rounded shadow-md w-px whitespace-nowrap {saveink ? 'text-green-400' : 'bg-green-400'}"
          >{l.itemPrice}</td
        >
        <td class="p-2 rounded shadow-md w-px whitespace-nowrap {saveink ? 'text-green-400' : 'bg-green-400'}"
          >{l.itemQty}</td
        >
        <td class="p-2 rounded shadow-md w-px whitespace-nowrap {saveink ? 'text-green-400' : 'bg-green-400'}"
          >{l.itemAmount}</td
        >
      </tr>
    </thead>
    <tbody class="">
      {#each q.itemDesc as _, i (`item-${i}`)}
        <tr class="border-b">
          <td class="p-2 text-center whitespace-nowrap" contenteditable="true">{i + 1}</td>
          <td class="p-2" contenteditable="true" bind:textContent={q.itemDesc[i]}></td>
          <td
            class="p-2 text-center whitespace-nowrap"
            contenteditable="true"
            onfocus={(e) => {
              e.target.textContent = q.itemPrice[i];
            }}
            oninput={(e) => {
              q.itemPrice[i] = e.target.textContent;
            }}
            onblur={(e) => {
              e.target.textContent = price(q.itemPrice[i]);
            }}
          >
            {price(q.itemPrice[i])}
          </td>
          <td
            class="p-2 text-center whitespace-nowrap"
            contenteditable="true"
            onfocus={(e) => {
              e.target.textContent = q.itemQty[i];
            }}
            oninput={(e) => {
              q.itemQty[i] = e.target.textContent;
            }}
            onblur={(e) => {
              e.target.textContent = q.itemQty[i].toLocaleString();
            }}
          >
            {q.itemQty[i].toLocaleString()}
          </td>
          <td class="p-2 text-right whitespace-nowrap">
            {price(itemAmount[i])}
          </td>
        </tr>
      {/each}
    </tbody>
    <tfoot class="">
      <tr class="">
        <td class="p-2 text-center" colspan="2" rowspan={q.doc === "receipt" ? 5 : 4}>
          <div class="grid grid-cols-2">
            <div class="rounded-3xl shadow-md text-center">
              <div class="">{l.vendorSign}</div>
              <div class="" contenteditable="true"></div>
              <div class="" contenteditable="true"></div>
            </div>
            <div class="rounded-3xl shadow-md text-center">
              <div class="">{l.clientSign}</div>
              <div class="" contenteditable="true"></div>
              <div class="" contenteditable="true"></div>
            </div>
          </div>
        </td>
        <td class="p-2 text-center whitespace-nowrap" colspan="2">{l.totalAmount}</td>
        <td class="p-2 text-right whitespace-nowrap">
          {price(totalAmount)}
        </td>
      </tr>
      <tr class="">
        <td class="p-2 text-center whitespace-nowrap" colspan="2">
          <span class="">{l.totalVat}</span>
          <span class=""> </span>
          <span
            class=""
            contenteditable="true"
            onfocus={(e) => {
              e.target.textContent = q.vatRate;
            }}
            oninput={(e) => {
              q.vatRate = e.target.textContent;
            }}
            onblur={(e) => {
              e.target.textContent = `${(Number(q.vatRate) * 100).toLocaleString()} %`;
            }}
          >
            {(Number(q.vatRate) * 100).toLocaleString()} %
          </span>
        </td>
        <td class="p-2 text-right whitespace-nowrap">
          {price(totalVat)}
        </td>
      </tr>
      {#if q.doc === "receipt"}
        <tr class="">
          <td class="p-2 text-center whitespace-nowrap" colspan="2">
            <span class="">{l.totalWht}</span>
            <span class=""> </span>
            <span
              class=""
              contenteditable="true"
              onfocus={(e) => {
                e.target.textContent = q.whtRate;
              }}
              oninput={(e) => {
                q.whtRate = e.target.textContent;
              }}
              onblur={(e) => {
                e.target.textContent = `${(Number(q.whtRate) * 100).toLocaleString()} %`;
              }}
            >
              {(Number(q.whtRate) * 100).toLocaleString()} %
            </span>
          </td>
          <td class="p-2 text-right whitespace-nowrap">
            {price(totalWht)}
          </td>
        </tr>
      {/if}
      <tr class="">
        <td class="p-2 text-center whitespace-nowrap" colspan="2">{l.totalAdjust}</td>
        <td
          class="p-2 text-right"
          contenteditable="true"
          onfocus={(e) => {
            e.target.textContent = q.adjust;
          }}
          oninput={(e) => {
            q.adjust = e.target.textContent;
          }}
          onblur={(e) => {
            e.target.textContent = price(q.adjust);
          }}
        >
          {price(q.adjust)}
        </td>
      </tr>
      <tr class="">
        <td class="p-2 text-center whitespace-nowrap" colspan="2">{l.totalFinal}</td>
        <td class="p-2 text-right whitespace-nowrap">
          {price(totalFinal)}
        </td>
      </tr>
    </tfoot>
  </table>
  <div class="grid grid-cols-2 gap-4 pl-6 pr-2">
    <div class="">
      <h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">
        {l.vendor}
      </h3>
      <h2 class="text-xl mb-2" contenteditable="true" bind:textContent={q.vendorName}></h2>
      <p class="pl-3 mb-2" contenteditable="true" bind:textContent={q.vendorId}></p>
      <p class="pl-3 mb-2" contenteditable="true" bind:textContent={q.vendorAddress}></p>
    </div>
    <div class="">
      <h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">
        {l.note}
      </h3>
      <p class="pl-3 mb-3" contenteditable="true" bind:textContent={q.note}></p>
      <h2 class=" text-xl text-center text-green-400">{l.thankMessage}</h2>
    </div>
  </div>
</div>

<div class="flex flex-wrap justify-center items-center my-4 print:hidden gap-4">
  <label class="">
    <span class="">Currency:</span>
    <input class="border border-green-500 w-12" type="text" bind:value={q.currency} />
  </label>
  <button
    class="block duration-300 p-4 bg-green-500 text-gray-100 hover:bg-gray-100 focus:bg-gray-100 hover:text-gray-900 focus:text-gray-900"
    onclick={() => {
      print();
    }}
  >
    Print
  </button>
  <label class="">
    <span class="">Save ink:</span>
    <input class="accent-green-500" type="checkbox" bind:checked={saveink} />
  </label>
</div>
