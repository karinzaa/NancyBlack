﻿using Nancy;
using NantCom.NancyBlack.Configuration;
using NantCom.NancyBlack.Modules.CommerceSystem.types;
using NantCom.NancyBlack.Modules.ContentSystem.Types;
using NantCom.NancyBlack.Modules.DatabaseSystem;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Runtime.Caching;
using System.Text;
using System.Web;

namespace NantCom.NancyBlack.Modules.CommerceSystem
{
    public class CommerceAdminModule : BaseModule
    {
        public CommerceAdminModule()
        {
            Get["/admin/tables/product"] = this.HandleViewRequest("/Admin/productmanager", null);
            Get["/admin/tables/suplier"] = this.HandleViewRequest("/Admin/suppliermanager", null);
            
            Get["/admin/commerce/settings"] = this.HandleViewRequest("/Admin/commerceadmin-settings", null);

            Post["/admin/commerce/api/uploadlogo"] = this.HandleRequest((arg) =>
            {
                var file = this.Request.Files.First();
                var filePath = "Site/billinglogo" + Path.GetExtension(file.Name);
                using (var localFile = File.OpenWrite(Path.Combine(this.RootPath, filePath)))
                {
                    file.Value.CopyTo(localFile);
                }

                return "/" + filePath;
            });

            Get["/admin/commerce/api/exchangerate"] = this.HandleRequest(this.GetExchangeRate);

            Patch["/tables/product/{id:int}"] = this.HandleRequest(this.HandleProductSave);

            Post["/admin/commerce/api/pay"] = this.HandleRequest(this.HandlePayRequest);

            Get["/admin/commerce/printreceipt"] = this.HandleViewRequest("/Admin/commerceadmin-receiptprint", (arg)=>
            {
                var now = DateTime.Now;
                var lastMonth = now.AddMonths(-1);
                lastMonth = new DateTime(lastMonth.Year, lastMonth.Month, 1, 0, 0, 0); // first second of last month

                var thisMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0);
                thisMonth = thisMonth.AddSeconds(-1); // one second before start of this month

                var result = this.SiteDatabase.Query<Receipt>()
                                .Where(r => r.__updatedAt >= lastMonth && r.__updatedAt <= thisMonth)
                                .OrderBy( r => r.Id )
                                .ToList();

                return new StandardModel(this, null, result);
            });

            #region Quick Actions

            Post["/admin/commerce/api/enablesizing"] = this.HandleRequest(this.EnableSizingVariations);

            #endregion
        }
        
        private dynamic HandlePayRequest(dynamic arg)
        {
            if (!this.CurrentUser.HasClaim("admin"))
            {
                return 403;
            }

            var param = ((JObject)arg.body.Value);

            DateTime paidWhen = param.Value<DateTime>("paidWhen").ToLocalTime();
            string soIdentifier = param.Value<string>("saleOrderIdentifier");
            string apCode = param.Value<string>("apCode");
            var form = new JObject();
            form.Add("apCode", apCode);

            var paymentLog = new PaymentLog()
            {
                PaymentSource = param.Value<string>("paymentMethod"),
                Amount = param.Value<decimal>("amount"),
                IsErrorCode = false,
                ResponseCode = "00",
                IsPaymentSuccess = true,
                SaleOrderIdentifier = soIdentifier,
                PaymentDate = paidWhen,
                FormResponse = form
            };

            CommerceModule.HandlePayment(this.SiteDatabase, paymentLog, paidWhen);

            return paymentLog;

        }

        private dynamic EnableSizingVariations(dynamic arg)
        {
            TableSecModule.ThrowIfNoPermission(this.Context, "Product", TableSecModule.PERMISSON_UPDATE);

            var sizes = (string)arg.body.Value.choices;

            this.SiteDatabase.Transaction(() =>
            {
                foreach (var item in this.SiteDatabase.Query<Product>()
                                        .Where(p => p.IsVariation == false)
                                        .AsEnumerable())
                {
                    item.HasVariation = true;
                    item.VariationAttributes = JArray.FromObject(new[] { new
                    {
                        Name = "Size",
                        Choices = sizes
                    }});

                    this.HandleProductSave(JObject.FromObject(new
                    {
                        body = new
                        {
                            Value = item
                        }
                    }));
                }
            });

            return 200;
        }

        private dynamic HandleProductSave(dynamic arg)
        {
            TableSecModule.ThrowIfNoPermission(this.Context, "Product", TableSecModule.PERMISSON_UPDATE);


            var input = arg.body.Value as JObject;
            var product = input.ToObject<Product>();

            var dupe = this.SiteDatabase.Query<Product>()
                .Where(p => p.Url == product.Url)
                .FirstOrDefault();

            if (dupe != null && dupe.Id != product.Id)
            {
                throw new InvalidOperationException("Duplicate Url");
            }

            if (product.HasVariation == false)
            {
                this.SiteDatabase.UpsertRecord<Product>(product);
            }

            var attributes = product.VariationAttributes as JArray;
            if (attributes == null)
            {
                this.SiteDatabase.UpsertRecord<Product>(product);
                return product;
            }


            // handle generation of product variation
            this.SiteDatabase.Transaction(() =>
            {
                List<string[]> variations = new List<string[]>();
                foreach (JObject prop in attributes)
                {
                    var choices = from item in prop["Choices"].ToString().Split(',')
                                  select item.Trim();

                    variations.Add(choices.ToArray());
                }

                Action<string> createProduct = (url) =>
                {
                    var newUrl = (product.Url + url).ToLowerInvariant();

                    // copy all information from current product to replace the variation product
                    var newProduct = JObject.FromObject(product).ToObject<Product>();
                    var existingProduct = this.SiteDatabase.Query<Product>()
                                        .Where(p => p.Url == newUrl)
                                        .FirstOrDefault();

                    if (existingProduct == null)
                    {
                        newProduct.Id = 0;
                    }
                    else
                    {
                        newProduct.Id = existingProduct.Id;
                    }

                    newProduct.MasterProductId = product.Id;
                    newProduct.IsVariation = true;
                    newProduct.HasVariation = false;
                    newProduct.VariationAttributes = null;
                    newProduct.Url = newUrl;

                    var parts = url.Split(new char[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
                    var newProductAttributes = new JObject();

                    for (int i = 0; i < attributes.Count; i++)
                    {
                        newProductAttributes[attributes[i]["Name"].ToString()] = parts[i];
                    }

                    newProduct.Title += " (Variation:" + url + ")";
                    newProduct.Attributes = newProductAttributes;
                    this.SiteDatabase.UpsertRecord<Product>(newProduct);

                };

                Action<string, int> dig = null;
                dig = (baseUrl, index) =>
                {
                    foreach (var choice in variations[index])
                    {
                        var currentUrl = baseUrl + "/" + choice;

                        if (index + 1 == variations.Count)
                        {
                            createProduct(currentUrl);
                        }
                        else
                        {
                            dig(currentUrl, index + 1);
                        }

                    }
                };

                dig("", 0);
                this.SiteDatabase.UpsertRecord<Product>(product);
            });

            return product;
        }

        private dynamic GetExchangeRate(dynamic arg)
        {
            byte[] cached = CommerceAdminModule.GetExchangeRateData();

            var response = new Response();
            response.Contents = (s) =>
            {
                s.Write(cached, 0, cached.Length);
            };

            return response;

        }

        public static dynamic ExchangeRate
        {
            get
            {
                byte[] exchangeRateData = CommerceAdminModule.GetExchangeRateData();
                return JObject.Parse(Encoding.UTF8.GetString(exchangeRateData)).Property("rates").Value;
            }
        }


        private static byte[] GetExchangeRateData()
        {
            byte[] array = MemoryCache.Default["ExchangeRates"] as byte[];
            if (array == null)
            {
                WebClient web = new WebClient();
                array = web.DownloadData("https://openexchangerates.org/api/latest.json?app_id=8ecf50d998af4c2f837bfa416698784e");
                web.Dispose();
                MemoryCache.Default.Add("ExchangeRates", array, DateTimeOffset.Now.AddMinutes(60.0), null);
            }
            return array;
        }
    }
}