<script>
	import { onMount } from "svelte";
	export let data;

	let l = data[""].label[""];
	let q = data[""].q;

	const price = number => {
	  number = Number(number);
	  if (number === 0 || isNaN(number)) {
	    return "";
	  }
	  return `${q.currency} ${number.toLocaleString(undefined, {
	    minimumFractionDigits: 2
	  })}`;
	};
	const qty = number => {
	  number = Number(number);
	  if (number === 0 || isNaN(number)) {
	    return "";
	  }
	  return number.toLocaleString(undefined, {
	    minimumFractionDigits: 0
	  });
	};
	const rate = rate => {
	  rate = Number(rate) * 100;
	  if (!Number.isInteger(rate)) {
	    rate = rate.toFixed(2);
	  }
	  return `${rate} %`;
	};
	const addItem = () => {
	  q.itemDesc.push("");
	  q.itemPrice.push("");
	  q.itemQty.push("");
	  q = q;
	};
	const removeItem = () => {
	  q.itemDesc.pop();
	  q.itemPrice.pop();
	  q.itemQty.pop();
	  q = q;
	};

	onMount(() => {
	  const s = new URLSearchParams(location.search);
	  let obj = q;
	  Object.keys(q).forEach(key => {
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

	$: {
	  document.body.style = data[q.lang]["font-style"];
	}
	$: l = {
	  ...data[q.lang].label[""],
	  ...data[q.lang].label[q.doc]
	};
	$: q.itemAmount = q.itemPrice.map((pr, i) => {
	  const num = Number(pr) * Number(q.itemQty[i]);
	  return num ? num : "";
	});
	$: q.totalAmount = q.itemAmount.reduce((a, b) => {
	  const num = Number(a) + Number(b);
	  return num ? num : "";
	}, 0);
	$: q.totalVat = Number(q.totalAmount) * Number(q.vatRate);
	$: q.totalWht = Number(q.totalAmount) * Number(q.whtRate);
	$: q.totalFinal =
	  Number(q.totalAmount) +
	  Number(q.totalVat) +
	  Number(q.totalWht) +
	  Number(q.totalAdjust);
</script>

<svelte:head>
	<link href={data[q.lang]['font-link']} rel="stylesheet"/>
</svelte:head>

<div class="flex flex-wrap justify-center items-center my-4 print:hidden">
	{#each Object.keys(data) as lng, i (`lang-${i}`)}
		<button class="block duration-300 p-4 {q.lang === lng ? "bg-green-500 text-gray-100" : "text-gray-900 bg-gray-100 hover:bg-green-500 focus:bg-green-500 hover:text-gray-100 focus:text-gray-100"}" on:click={() => {
			q.lang = lng
		}}>
			{data[lng]['']}
		</button>
	{/each}
	{#each Object.keys(data[q.lang].label) as dc, i (`doc-${i}`)}
		<button class="block duration-300 p-4 {q.doc === dc ? "bg-green-500 text-gray-100" : "text-gray-900 bg-gray-100 hover:bg-green-500 focus:bg-green-500 hover:text-gray-100 focus:text-gray-100"}" on:click={() => {
			q.doc = dc
		}}>
			{data[q.lang].label[dc].title}
		</button>
	{/each}
</div>

<div class="bg-white text-black max-w-[60rem] mx-auto print:max-w-none print:mx-0" >
	<div class="grid grid-cols-2">
		<div class="">
			<div class="w-1/2 md:w-1/3 h-full p-2 mx-auto rounded-b-full bg-green-400 shadow-lg">
				<img class="my-auto" src={q.vendorLogo} alt="" width="" height="">
			</div>
		</div>
		<div class="grid grid-cols-2 gap-2 self-center">
			<h1 class="rounded text-center text-4xl border-b-2 border-green-400 text-green-400 shadow-md col-span-full p-3">{l.title}</h1>
			<div class=" text-right">{l.ref}</div>
			<div class="" contenteditable="true" bind:textContent={q.ref}></div>
			<div class=" text-right">{l.date}</div>
			<div class="" contenteditable="true" bind:textContent={q.date}></div>
			{#if q.doc !== 'receipt'}
				<div class=" text-right">{l.duedate}</div>
				<div class="" contenteditable="true" bind:textContent={q.duedate}></div>
			{/if}
		</div>
	</div>
	<div class="grid grid-cols-2 gap-4 pl-6 pr-2">
		<div class="">
			<h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">{l.client}</h3>
			<h2 class="text-xl mb-2" contenteditable="true" bind:textContent={q.clientName}></h2>
			<p class="pl-3 mb-2" contenteditable="true" bind:textContent={q.clientId}></p>
			<p class="pl-3 mb-2" contenteditable="true" bind:textContent={q.clientAddress}></p>
		</div>
		<div class="">
			<h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">{l.paymethod}</h3>
			<p class="pl-3 mb-3" contenteditable="true" bind:textContent={q.paymethod}></p>
			<h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">{l.subject}</h3>
			<p class="pl-3" contenteditable="true" bind:textContent={q.subject}></p>
		</div>
	</div>
	<table class="w-full my-3">
		<thead class="text-center">
			<tr class="text-white ">
				<td class="p-2 bg-green-400 rounded shadow-md w-px whitespace-nowrap">{l.itemNo}</td>
				<td class="bg-green-400 rounded shadow-md">
					<div class="flex">
						<p class="p-2 flex-grow">{l.itemDesc}</p>
						<button class="p-2 focus:bg-green-600 hover:bg-green-600 rounded-full transition duration-300 ease-in-out print:hidden" on:click={addItem}>
							<!-- heroicons solid duplicate -->
							<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
								<path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
								<path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
							</svg>
						</button>
						<button class="p-2 focus:bg-green-600 hover:bg-green-600 rounded-full transition duration-300 ease-in-out print:hidden" on:click={removeItem}>
							<!-- heroicons solid trash -->
							<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
						</button>
					</div>
				</td>
				<td class="p-2 bg-green-400 rounded shadow-md w-px whitespace-nowrap">{l.itemPrice}</td>
				<td class="p-2 bg-green-400 rounded shadow-md w-px whitespace-nowrap">{l.itemQty}</td>
				<td class="p-2 bg-green-400 rounded shadow-md w-px whitespace-nowrap">{l.itemAmount}</td>
			</tr>
		</thead>
		<tbody class="">
			{#each q.itemDesc as _, i (`item-${i}`)}
				<tr class="border-b">
					<td class="p-2 text-center whitespace-nowrap" contenteditable="true">{i + 1}</td>
					<td class="p-2" contenteditable="true" bind:textContent={q.itemDesc[i]}></td>
					<td class="p-2 text-center whitespace-nowrap" contenteditable="true"
						on:focus={(e) => e.target.textContent = q.itemPrice[i]}
						on:input={(e) => q.itemPrice[i] = e.target.textContent}
						on:blur={(e) => e.target.textContent = price(q.itemPrice[i])}
					>
						{price(q.itemPrice[i])}
					</td>
					<td class="p-2 text-center whitespace-nowrap" contenteditable="true"
						on:focus={(e) => e.target.textContent = q.itemQty[i]}
						on:input={(e) => q.itemQty[i] = e.target.textContent}
						on:blur={(e) => e.target.textContent = qty(q.itemQty[i])}
					>
						{qty(q.itemQty[i])}
					</td>
					<td class="p-2 text-right whitespace-nowrap">
						{price(q.itemAmount[i])}
					</td>
				</tr>
			{/each}
		</tbody>
		<tfoot class="">
			<tr class="">
				<td class="p-2 text-center" colspan="2" rowspan={q.doc === 'receipt' ? 5 : 4}>
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
				<td class="p-2 text-center  whitespace-nowrap" colspan="2">{l.totalAmount}</td>
				<td class="p-2 text-right whitespace-nowrap">
					{price(q.totalAmount)}
				</td>
			</tr>
			<tr class="">
				<td class="p-2 text-center  whitespace-nowrap" colspan="2">
					<span class="">{l.totalVat}</span>
					<span class=""> </span>
					<span class="" contenteditable="true" 
						on:focus={(e) => e.target.textContent = q.vatRate}
						on:input={(e) => q.vatRate = e.target.textContent}
						on:blur={(e) => e.target.textContent = rate(q.vatRate)}
					>
						{rate(q.vatRate)}
					</span>
				</td>
				<td class="p-2 text-right whitespace-nowrap">
					{price(q.totalVat)}
				</td>
			</tr>
			{#if q.doc === 'receipt'}
				<tr class="">
					<td class="p-2 text-center  whitespace-nowrap" colspan="2">
						<span class="">{l.totalWht}</span>
						<span class=""> </span>
						<span class="" contenteditable="true" 
							on:focus={(e) => e.target.textContent = q.whtRate}
							on:input={(e) => q.whtRate = e.target.textContent}
							on:blur={(e) => e.target.textContent = rate(q.whtRate)}
						>
							{rate(q.whtRate)}
						</span>
					</td>
					<td class="p-2 text-right whitespace-nowrap">
						{price(q.totalWht)}
					</td>
				</tr>
			{/if}
			<tr class="">
				<td class="p-2 text-center  whitespace-nowrap" colspan="2">{l.totalAdjust}</td>
				<td class="p-2 text-right" contenteditable="true" 
					on:focus={(e) => e.target.textContent = q.totalAdjust}
					on:input={(e) => q.totalAdjust = e.target.textContent}
					on:blur={(e) => e.target.textContent = price(q.totalAdjust)}
				>
					{price(q.totalAdjust)}
				</td>
			</tr>
			<tr class="">
				<td class="p-2 text-center  whitespace-nowrap" colspan="2">{l.totalFinal}</td>
				<td class="p-2 text-right whitespace-nowrap">
					{price(q.totalFinal)}
				</td>
			</tr>
		</tfoot>
	</table>
	<div class="grid grid-cols-2 gap-4 pl-6 pr-2">
		<div class="">
			<h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">{l.vendor}</h3>
			<h2 class="text-xl mb-2" contenteditable="true" bind:textContent={q.vendorName}></h2>
			<p class="pl-3 mb-2" contenteditable="true" bind:textContent={q.vendorId}></p>
			<p class="pl-3 mb-2" contenteditable="true" bind:textContent={q.vendorAddress}></p>
		</div>
		<div class="">
			<h3 class=" border-b-2 border-green-400 text-green-400 pb-1 mb-1">{l.note}</h3>
			<p class="pl-3 mb-3" contenteditable="true" bind:textContent={q.note}></p>
			<h2 class=" text-xl text-center text-green-400">{l.thankMessage}</h2>
		</div>
	</div>
</div>

<div class="flex flex-wrap justify-center items-center my-4 print:hidden gap-4">
	<label class="">
		<span class="">Currency:</span>
		<input class="border border-green-500 w-12" bind:value={q.currency} />
	</label>
	<button
		class="block duration-300 p-4 bg-green-500 text-gray-100 hover:bg-gray-100 focus:bg-gray-100 hover:text-gray-900 focus:text-gray-900"
		on:click={() => window.print()}
	>
		Print
	</button>
</div>