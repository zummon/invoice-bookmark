<script>
  import { onMount } from "svelte";
  const theOption = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  let { data } = $props();

  let query = $state({
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
    itemPrice: [0, 0, 0, 0, 0, 0],
    itemQty: [0, 0, 0, 0, 0, 0],
    vatRate: 0.05,
    whtRate: 0,
    adjust: 0,
    note: "",
  });
  let saveink = $state(false);

  let l = $derived({
    ...data[query.lang][""][""],
    ...data[query.lang][""][query.doc],
  });
  let itemAmount = $derived(
    query.itemPrice.map((_, index) => {
      return query.itemPrice[index] * query.itemQty[index];
    })
  );
  let totalAmount = $derived(
    itemAmount.reduce((prev, curr) => {
      return prev + curr;
    }, 0)
  );
  let totalVat = $derived(totalAmount * query.vatRate);
  let totalWht = $derived(totalAmount * query.whtRate);
  let totalFinal = $derived(totalAmount + totalVat + totalWht + query.adjust);

  onMount(() => {
    const searchParams = new URLSearchParams(location.search);
    Object.keys({ ...query }).forEach((key) => {
      const values = searchParams.getAll(key);
      if (values.length > 0) {
        if (Array.isArray(query[key])) {
          values.forEach((value, index) => {
            if (typeof query[key][index] == "number") {
              query[key][index] = Number(value);
            } else {
              query[key][index] = value;
            }
          });
        } else if (typeof query[key] == "number") {
          query[key] = Number(values[0]);
        } else {
          query[key] = values[0];
        }
      }
    });
  });
</script>

<svelte:head>
  <link href={data[query.lang].fontLink} rel="stylesheet" />
</svelte:head>

<div class="flex flex-wrap justify-center items-center my-4 print:hidden">
  {#each Object.keys(data) as lng}
    <button
      class="block duration-300 p-4 {query.lang === lng
        ? 'bg-green-500 text-gray-100'
        : 'text-gray-900 bg-gray-100 hover:bg-green-500 focus:bg-green-500 hover:text-gray-100 focus:text-gray-100'}"
      onclick={() => {
        query.lang = lng;
        if (lng == "th") {
          query.currency = "฿";
          query.date = new Date().toLocaleDateString("th");
          query.vendorName = "ชื่อผู้ขาย";
          query.vendorId = "เลขประจำตัว";
          query.vendorAddress = "ที่อยู่";
          query.clientName = "ชื่อลูกค้า";
          query.clientId = "เลขประจำตัว";
          query.clientAddress = "ที่อยู่";
          query.vatRate = "0.07";
        } else {
          query.currency = "$";
          query.date = new Date().toLocaleDateString(undefined);
          query.vendorName = "Vendor Name";
          query.vendorId = "Register";
          query.vendorAddress = "Address";
          query.clientName = "Client Name";
          query.clientId = "Register";
          query.clientAddress = "Address";
          query.vatRate = "0.05";
        }
      }}
    >
      {data[lng].local}
    </button>
  {/each}
  {#each Object.keys(data[query.lang][""]) as doc}
    <button
      class="block duration-300 p-4 {query.doc === doc
        ? 'bg-green-500 text-gray-100'
        : 'text-gray-900 bg-gray-100 hover:bg-green-500 focus:bg-green-500 hover:text-gray-100 focus:text-gray-100'}"
      onclick={() => {
        query.doc = doc;
      }}
    >
      {data[query.lang][""][doc].title}
    </button>
  {/each}
</div>

<div class="max-w-[60rem] mx-auto print:max-w-none print:mx-0" style="font-family: {data[query.lang].fontFamily};">
  <div class="grid grid-cols-2">
    <div class="">
      <div class="w-1/2 md:w-1/3 h-full p-2 mx-auto rounded-b-full shadow-lg {saveink ? '' : 'bg-green-400'}">
        <img class="my-auto" src={query.vendorLogo} alt="" width="" height="" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2 self-center">
      <h1 class="rounded text-center text-4xl border-b-2 border-green-400 text-green-400 shadow-md col-span-full p-3">
        {l.title}
      </h1>
      <div class=" text-right">{l.ref}</div>
      <div class="" contenteditable="true" bind:textContent={query.ref}></div>
      <div class=" text-right">{l.date}</div>
      <div class="" contenteditable="true" bind:textContent={query.date}></div>
      {#if query.doc !== "receipt"}
        <div class=" text-right">{l.duedate}</div>
        <div class="" contenteditable="true" bind:textContent={query.duedate}></div>
      {/if}
    </div>
  </div>
  <div class="grid grid-cols-2 gap-4 pl-6 pr-2">
    <div class="">
      <h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">
        {l.client}
      </h3>
      <h2 class="text-xl mb-2" contenteditable="true" bind:textContent={query.clientName}></h2>
      <p class="pl-3 mb-2" contenteditable="true" bind:textContent={query.clientId}></p>
      <p class="pl-3 mb-2" contenteditable="true" bind:textContent={query.clientAddress}></p>
    </div>
    <div class="">
      <h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">
        {l.paymethod}
      </h3>
      <p class="pl-3 mb-3" contenteditable="true" bind:textContent={query.paymethod}></p>
      <h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">
        {l.subject}
      </h3>
      <p class="pl-3" contenteditable="true" bind:textContent={query.subject}></p>
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
                query.itemDesc.push("");
                query.itemPrice.push("");
                query.itemQty.push("");
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
                query.itemDesc.pop();
                query.itemPrice.pop();
                query.itemQty.pop();
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
      {#each query.itemDesc as _, index (`item-${index}`)}
        <tr class="border-b">
          <td class="p-2 text-center whitespace-nowrap" contenteditable="true">{index + 1}</td>
          <td class="p-2" contenteditable="true" bind:textContent={query.itemDesc[index]}></td>
          <td
            class="p-2 text-center whitespace-nowrap"
            contenteditable="true"
            onfocus={(e) => {
              e.target.textContent = query.itemPrice[index];
            }}
            oninput={(e) => {
              query.itemPrice[index] = Number(e.target.textContent);
            }}
            onblur={(e) => {
              e.target.textContent = query.itemPrice[index]
                ? query.itemPrice[index].toLocaleString(undefined, theOption)
                : "";
            }}
          >
            {query.itemPrice[index] ? query.itemPrice[index].toLocaleString(undefined, theOption) : ""}
          </td>
          <td
            class="p-2 text-center whitespace-nowrap"
            contenteditable="true"
            onfocus={(e) => {
              e.target.textContent = query.itemQty[index];
            }}
            oninput={(e) => {
              query.itemQty[index] = Number(e.target.textContent);
            }}
            onblur={(e) => {
              e.target.textContent = query.itemQty[index] ? query.itemQty[index].toLocaleString() : "";
            }}
          >
            {query.itemQty[index] ? query.itemQty[index].toLocaleString() : ""}
          </td>
          <td class="p-2 text-right whitespace-nowrap">
            {itemAmount[index] ? itemAmount[index].toLocaleString(undefined, theOption) : ""}
          </td>
        </tr>
      {/each}
    </tbody>
    <tfoot class="">
      <tr class="">
        <td class="p-2 text-center" colspan="2" rowspan={query.doc === "receipt" ? 5 : 4}>
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
          {totalAmount.toLocaleString(undefined, theOption)}
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
              e.target.textContent = query.vatRate;
            }}
            oninput={(e) => {
              query.vatRate = Number(e.target.textContent);
            }}
            onblur={(e) => {
              e.target.textContent = `${(query.vatRate * 100).toLocaleString()} %`;
            }}
          >
            {(query.vatRate * 100).toLocaleString()} %
          </span>
        </td>
        <td class="p-2 text-right whitespace-nowrap">
          {totalVat.toLocaleString(undefined, theOption)}
        </td>
      </tr>
      {#if query.doc === "receipt"}
        <tr class="">
          <td class="p-2 text-center whitespace-nowrap" colspan="2">
            <span class="">{l.totalWht}</span>
            <span class=""> </span>
            <span
              class=""
              contenteditable="true"
              onfocus={(e) => {
                e.target.textContent = query.whtRate;
              }}
              oninput={(e) => {
                query.whtRate = Number(e.target.textContent);
              }}
              onblur={(e) => {
                e.target.textContent = `${(query.whtRate * 100).toLocaleString()} %`;
              }}
            >
              {(query.whtRate * 100).toLocaleString()} %
            </span>
          </td>
          <td class="p-2 text-right whitespace-nowrap">
            {totalWht.toLocaleString(undefined, theOption)}
          </td>
        </tr>
      {/if}
      <tr class="">
        <td class="p-2 text-center whitespace-nowrap" colspan="2">{l.totalAdjust}</td>
        <td
          class="p-2 text-right"
          contenteditable="true"
          onfocus={(e) => {
            e.target.textContent = query.adjust;
          }}
          oninput={(e) => {
            query.adjust = Number(e.target.textContent);
          }}
          onblur={(e) => {
            e.target.textContent = query.adjust.toLocaleString(undefined, theOption);
          }}
        >
          {query.adjust.toLocaleString(undefined, theOption)}
        </td>
      </tr>
      <tr class="">
        <td class="p-2 text-center whitespace-nowrap" colspan="2">{l.totalFinal}</td>
        <td class="p-2 text-right whitespace-nowrap">
          <span class="bg-yellow-300 print:bg-transparent" contenteditable="true" bind:textContent={query.currency}
          ></span>
          {totalFinal.toLocaleString(undefined, theOption)}
        </td>
      </tr>
    </tfoot>
  </table>
  <div class="grid grid-cols-2 gap-4 pl-6 pr-2">
    <div class="">
      <h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">
        {l.vendor}
      </h3>
      <h2 class="text-xl mb-2" contenteditable="true" bind:textContent={query.vendorName}></h2>
      <p class="pl-3 mb-2" contenteditable="true" bind:textContent={query.vendorId}></p>
      <p class="pl-3 mb-2" contenteditable="true" bind:textContent={query.vendorAddress}></p>
    </div>
    <div class="">
      <h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">
        {l.note}
      </h3>
      <p class="pl-3 mb-3" contenteditable="true" bind:textContent={query.note}></p>
      <h2 class=" text-xl text-center text-green-400">{l.thankMessage}</h2>
    </div>
  </div>
</div>

<div class="flex flex-wrap justify-center items-center my-4 print:hidden gap-4">
  <label class="">
    <span class="">Save ink:</span>
    <input class="accent-green-500" type="checkbox" bind:checked={saveink} />
  </label>
  <button
    class="block duration-300 p-4 bg-green-500 text-gray-100 hover:bg-gray-100 focus:bg-gray-100 hover:text-gray-900 focus:text-gray-900"
    onclick={() => {
      print();
    }}
  >
    Print
  </button>
</div>
